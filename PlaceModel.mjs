import {h} from './preact.module.mjs'

import {TimeZonesTree} from './timezones.mjs'

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
PlaceMC.addProperty('region', 'string');
PlaceMC.addProperty('zone', 'string');
PlaceMC.addProperty('dst', 'boolean');
PlaceMC.addProperty('timezone', 'number');

PlaceMC.addStateRequest();

PlaceMC.addAction('SetToDefault', function(state) {
    return Object.assign({}, state, {
        'name': 'New',
        'latitude':0,
        'longitude':0,
        'altitude':0,
        'region':'Europe',
        'zone': 'London',
        'dst': false
    });
});

function capatalise(s) {
    return s[0].toUpperCase() + s.slice(1);
}

function addSetAction(propertyName) {
    let actionName = propertyName;
    actionName = 'set'+capatalise(propertyName);
    PlaceMC.addAction(actionName, function(state, property) {
        let merger = {}
        merger[propertyName] = property
        return Object.assign({}, state, merger);
    });
}

addSetAction('name');
addSetAction('longitude');
addSetAction('latitude');
addSetAction('altitude');
addSetAction('region');

PlaceMC.addAction('setZone', function(state, zone) {
    let timezone = TimeZonesTree[state.region][zone][state.dst?1:0];
    return Object.assign({}, state, {
        'zone': zone,
        'timezone': timezone
    });
});

PlaceMC.addAction('setDST', function(state, dst) {
    let timezone = TimeZonesTree[state.region][state.zone][dst?1:0];
    return Object.assign({}, state, {
        'dst': dst,
        'timezone': timezone
    });
});

PlaceMC.addAction('update', function(state, name, latitude, longitude, altitude, region, zone, dst) {
    let timezone = TimeZonesTree[region][zone][dst?1:0];
    return Object.assign({}, state, {
        'name': name,
        'latitude': latitude,
        'longitude': longitude,
        'altitude': altitude,
        'region': region,
        'zone': zone,
        'dst': dst,
        'timezone': timezone
    });
});

function onChange(reduce, event) {
    let parts = event.target.id.split('_');
    let placeId = parts[1];
    let prop = capatalise(parts[2]);

    if ( prop == 'Region' || prop == 'Zone' ) {
        reduce('set'+prop, placeId, event.target.selectedOptions[0].value);
    } else if ( prop == 'Dst' ) {
        reduce('setDST', placeId, event.target.checked);
    } else {
        reduce('set'+prop, placeId, event.target.value);
    }
}

function tr(prop, children) {
    return h('tr',prop,[
        children.map( (item) => h('td',{},item) )
    ]);
}

function labelledInput(name, id, type, value, reduce, inputProp) {
    return tr({class: 'labelled_input_span'},[
        h('label', {for:id},[name]),
        h('input', Object.assign({id:id, type:type, value:value, 
            onChange:(event)=>onChange(reduce,event)}, inputProp), [])
    ]);
}

function labelledInputCheckbox(name, id, value, reduce, inputProp) {
    return tr({class: 'labelled_input_span'},[
        h('label', {for:id},[name]),
        h('input', Object.assign({id:id, type:'checkbox',  checked:value,
            onChange:(event)=>onChange(reduce,event)}, inputProp), [])
    ]);
}

function labelledInputButton(name, id, onClick) {
    return tr({}, [ h('button', {type:'button', onClick: onClick, id:id},name), '']);
}

function labelledInputSelect(name, id, selected, options, reduce, inputProp) {
    let optionElements = options.map( (option) => {
        return h('option', Object.assign({value:option, selected:(option == selected)
        }, inputProp),[option]);
    });
    return tr({class: 'labelled_input_span'}, [
        h('label', {for:id},[name]),
        h('select', Object.assign({id:id, 
            onChange:(event)=>onChange(reduce,event)} , inputProp), [optionElements])
    ]);
}

function labelledInputText(name, id, value, inputProp) {
    return tr({class: 'labelled_input_span'},[
        h('label', {for:id},[name]),
        h('span', Object.assign({id:id}, inputProp), [value])
    ]);
}

PlaceMC.addRequest( 'renderForm', function(state, reduce, onRemoveClick) {
    let placeId = 'place_'+state.id;
    return h('table', {id:placeId, class:'place'}, [ 
        labelledInput('Name', placeId+'_name', 'text',state.name, reduce),
        labelledInput('Latitude', placeId+'_latitude', 'number', state.latitude, reduce, {step:0.0001,min:-90,max:90}),
        labelledInput('Longitude', placeId+'_longitude', 'number', state.longitude, reduce, {step:0.0001,min:-180,max:180}),
        labelledInput('Altitude', placeId+'_altitude', 'number', state.altitude, reduce),
        labelledInputSelect('Region', placeId+'_region', state.region, ['UTC'].concat(Object.keys(TimeZonesTree)), reduce),
        labelledInputSelect('Time Zone', placeId+'_zone', state.zone, Object.keys(TimeZonesTree[state.region]), reduce),
        labelledInputCheckbox('Daylight Savings Time', placeId+'_dst', state.dst, reduce),
        labelledInputText('Offset', placeId+'_timezone', state.timezone),
        labelledInputButton('Remove', placeId+'_remove', onRemoveClick),
    ])
});

PlaceMC.addRequest( 'toStr', function(state) {
    return state.id+':'+
        state.name+','+
        str(state.latitude)+','+
        str(state.longitude)+','+
        str(state.altitude)+','+
        state.region+','+
        state.zone+','+
        (state.dst?'1':'0');
});

PlaceMC.addAction( 'fromStr', function(state, line) {
    let comp = line.split(':')[1].split(',')
    let newState = Object.assign({},state, {
        name: comp[0],
        latitude: comp[1],
        longitude: comp[2],
        altitude: comp[3],
        region: comp[4],
        zone: comp[5],
        dst: (comp[6]=='1')
    });
    let timezone = TimeZonesTree[newState.region][newState.zone][newState.dst?1:0];
    Object.assign(newState, {
        'timezone': timezone
    });
    return newState;
});

PlaceMC.addRequest( 'utcTimes', function(state, year, month, day) {
    let times = computeUTCNoonAndHourAngle(year, month, day, state.latitude, state.longitude);

    let hourFrac = times.hourAngle/360;
    let rise = times.noon - hourFrac;
    let set = times.noon + hourFrac;

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
    let times = computeUTCNoonAndHourAngle(year, month, day, state.latitude, state.longitude);

    times.noon = times.noon + state.timezone/24;

    let hourFrac = times.hourAngle/360;
    let rise = times.noon - hourFrac;
    let set = times.noon + hourFrac;

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

function intD( top, bot) {
    return Math.floor(top/bot);
}

function computeJulianDayNumber(year, month, day) {
    let mr = intD(month - 14,12);
    return intD(1461 * (year + 4800 + mr),4) +
        intD(367 * (month - 2 - 12 * mr),12) -
        intD(3 * intD(year + 4900 + mr,100),4) +
        day - 32075;
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
    let julianToday = computeJulianDayNumber(year, month+1, day);

    let meanSolarTime = julianToday - 2451545 + 0.0008 + longitude/360;
    let meanAnomaly = (357.5291+0.98560028* meanSolarTime) % 360;
    let equationOfCentre = 1.9148* sind(meanAnomaly)+0.0200* sind(2*meanAnomaly)+0.0003*sind(3*meanAnomaly);
    let ellipticLongitude = (meanAnomaly+equationOfCentre+180+102.9372) % 360;
    let solarNoon = 2451545.0+meanSolarTime + 0.0053*sind(meanAnomaly)-0.0069*sind(2*ellipticLongitude);

    let declination = degrees(Math.asin(sind(ellipticLongitude) * sind( 23.44)));
    let hourAngle = degrees(Math.acos( (sind(-0.83) - sind(latitude) * sind(declination)) / (cosd(latitude) * cosd(declination)) ))

    return {
        'noon': solarNoon - julianToday - longitude/180,
        'hourAngle': hourAngle
    };
}

function getTimeParts(dayFraction) {
    let s = Math.floor(dayFraction*86400);
    let h = intD(s,3600);
    s -= h * 3600;
    let m = intD(s,60);
    s -= m * 60;
    return [h,m,s];
}

function getTime(dayFraction) {
    let parts = getTimeParts(dayFraction)
    let h = parts[0]
    let m = parts[1]
    let s = parts[2]

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
