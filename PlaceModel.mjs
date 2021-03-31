import {h} from './preact.module.mjs'

import {ModelCreator} from './model-reducer.mjs'

function str(thing) {
    if (typeof(thing) == 'number') {
        return thing.toString();
    } else if (typeof(thing) == 'string' ) {
        return thing;
    }
}

var PlaceMC = new ModelCreator('Place');
PlaceMC.setCollectionKey('id');
PlaceMC.addProperty('name', 'string');
PlaceMC.addProperty('latitude', 'number');
PlaceMC.addProperty('longitude', 'number');
PlaceMC.addProperty('altitude', 'number');
PlaceMC.addProperty('timezone', 'string');
PlaceMC.addProperty('dst', 'boolean');

PlaceMC.addStateRequest();

PlaceMC.addAction('update', function(state, name, latitude, longitude, altitude, timezone, dst) {
    var timezone_value = 0;
    return Object.assign({}, state, {
        'name': name,
        'latitude': latitude,
        'longitude': longitude,
        'altitude': altitude,
        'timezone': timezone,
        'dst': dst,
        'timezone_value': timezone_value
    });
});

function labelledInput(name, id, type, value, inputProp) {
    return tr({class: 'labelled_input_span'},[
        h('label', {for:id},[name]),
        h('input', Object.assign({id:id, type:type, value:value}, inputProp), [])
    ]);
}

function labelledInputCheckbox(name, id, value, inputProp) {
    return tr({class: 'labelled_input_span'},[
        h('label', {for:id},[name]),
        h('input', Object.assign({id:id, type:'checkbox', checked:value}, inputProp), [])
    ]);
}

function tr(prop, children) {
    return h('tr',prop,[
        children.map( (item) => h('td',{},item) )
    ]);
}

function labelledInputButton(name, id, onClick) {
    return tr({}, [ h('button', {type:'button', onClick: onClick, id:id},name), '']);
}


PlaceMC.addRequest( 'renderForm', function(state, onRemoveClick) {
    var placeId = 'place_'+state.id;
    return h('table', {id:placeId, class:'place'}, [ 
        labelledInput('Name', placeId+'_name', 'text',state.name),
        labelledInput('Latitude', placeId+'_latitude', 'number', state.latitude,{step:0.0001,min:-90,max:90}),
        labelledInput('Longitude', placeId+'_longitude', 'number', state.longitude,{step:0.0001,min:-180,max:180}),
        labelledInput('Altitude', placeId+'_altitude', 'number', state.altitude),
        labelledInput('Time Zone', placeId+'_tz', 'string', state.timezone),
        labelledInputCheckbox('Daylight Savings Time', placeId+'_dst', state.dst),
        labelledInputButton('Remove', placeId+'_remove', onRemoveClick),
    ])
});

PlaceMC.addRequest( 'toStr', function(state) {
    console.log(state);
    return state.id+':'+
        state.name+','+
        str(state.latitude)+','+
        str(state.longitude)+','+
        str(state.altitude)+','+
        state.timezone+','+
        (state.dst?'1':'0');
});

PlaceMC.addAction( 'fromStr', function(state, line) {
    var comp = line.split(':')[1].split(',')
    var newState = Object.assign({},state, {
        name: comp[0],
        latitude: comp[1],
        longitude: comp[2],
        altitude: comp[3],
        timezone: comp[4],
        dst: (comp[5]=='1')
    });
    return newState;
});

PlaceMC.addRequest( 'utcTimes', function(state, year, month, day) {
    var times = computeUTCNoonAndHourAngle(year, month, day, state.latitude, state.longitude);

    var hourFrac = times.hourAngle/360;
    var rise = times.noon - hourFrac;
    var set = times.noon + hourFrac;

    return {
        'noon': getTime(times.noon),
        'rise': getTime(rise),
        'set': getTime(set),
        'hourAngle': times.hourAngle,
        'noonAngle': times.noon*360,
        'riseAngle': rise*360,
        'setAngle': set*360
    }
});

PlaceMC.addRequest( 'localTimes', function(state, year, month, day) {
    var times = computeUTCNoonAndHourAngle(year, month, day, state.latitude, state.longitude);

    times.noon = times.noon - longitude/180 +timezone/24;

    var hourFrac = times.hourAngle/360;
    var rise = times.noon - hourFrac;
    var set = times.noon + hourFrac;

    return {
        'noon': getTime(times.noon),
        'rise': getTime(rise),
        'set': getTime(set),
        'hourAngle': times.hourAngle,
        'noonAngle': times.noon*360,
        'riseAngle': rise*360,
        'setAngle': set*360
    }
});

function computeJulianDayNumber(year, month, day) {
    return (1461 * (year + 4800 + (month - 14)/12))/4 +
            (367 * (month - 2 - 12 * ((month - 14)/12)))/12 -
            (3 * ((year + 4900 + (month - 14)/12)/100))/4 +
            day - 32075
}

function sind(angle) {
    return Math.sin(angle/180 * Math.PI);
}
function cosd(angle) {
    return Math.cos(angle/180 * Math.PI);
}
function degrees(radians) {
    return radians/Math.PI * 180; 
}

function computeUTCNoonAndHourAngle(year, month, day, latitude, longitude) {
    let julianToday = computeJulianDayNumber(year, month, day);

    let meanSolarTime = julianToday - 2451545 + 0.0008 + longitude/360
    let meanAnomaly = (357.5291+0.98560028* meanSolarTime) % 360
    let equationOfCentre = 1.9148* sind(meanAnomaly)+0.0200* sind(2*meanAnomaly)+0.0003*sind(3*meanAnomaly)
    let ellipticLongitude = (meanAnomaly+equationOfCentre+180+102.9372) % 360
    let solarNoon = 2451545.0+meanSolarTime + 0.0053*sind(meanAnomaly)-0.0069*sind(2*ellipticLongitude)
    let declination = degrees(Math.asin(sind(ellipticLongitude) * sind( 23.44)))
    let hourAngle = degrees(Math.acos( (sind(-0.83) - sind(latitude) * sind(declination)) / (cosd(latitude) * cosd(declination)) ))

    return {
        'noon': solarNoon - julianToday,
        'hourAngle': hourAngle
    };
}

function getTimeParts(dayFraction) {
    var s = Math.floor(dayFraction*86400);
    var h = Math.floor(s/3600);
    s -= h * 3600;
    var m = Math.floor(s/60);
    s -= m * 60;
    return [h,m,s];
}

function getTime(dayFraction) {
    var parts = getTimeParts(dayFraction)
    var h = parts[0]
    var m = parts[1]
    var s = parts[2]

    h += 12
    while (m <0 || s < 0) {
        if (m < 0) {
            h -= 1
            m += 60
        }
        if (s < 0) {
            m -= 1
            s += 60
        }
    }
    return [h,m,s];
}


export const PlaceM = PlaceMC.finaliseModel();
