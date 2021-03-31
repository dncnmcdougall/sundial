import {h, Component, render} from './preact.module.mjs'

import {PlaceM} from './PlaceModel.mjs'
import {WorldM} from './WorldModel.mjs'
import {sun} from './sun.mjs'

import {TimeZonesTree} from './timezones.mjs'

function str(thing) {
    if (typeof(thing) == 'number') {
        return thing.toString();
    } else if (typeof(thing) == 'string' ) {
        return thing;
    }
}

function placesToUrl() {
    let placeIds = Object.keys(worldState.Places);
    let placeStrings = placeIds.map( (placeId) => {
        return WorldM.request('World.Places.toStr', worldState, placeId)
    });

    var newUrl = new URL(window.location.origin)

    newUrl.searchParams.append('places',placeStrings.join(';'));
    newUrl.searchParams.append('timezone',worldState.region+';'+worldState.zone);
    console.log(newUrl.href);
    window.location = newUrl;
}

function urlToPlaces() {
    const parsedUrl = new URL(window.location.href)
    var places = parsedUrl.searchParams.get('places')
    console.log('Places:')
    console.log(places)
    if ( places && places.length > 0 ) {
        places.split(';').forEach( (place) => {
            worldState = WorldM.reduce('World.AddPlaceFromStr',worldState, place);
        });
    } else {
        let place = '0:Exeter,50.7236,-3.5275,46,Europe/London,1';
        worldState = WorldM.reduce('World.AddPlaceFromStr',worldState, place);
        console.log('default:');
        console.log(worldState);
    }
    var timezone = parsedUrl.searchParams.get('timezone')
    if ( timezone && timezone.length > 0 ) {
        worldState.region = timezone.split(';')[0];
        worldState.zone = timezone.split(';')[1];
    } else {
        worldState.region = 'UTC';
        worldState.zone = '';
    }
}

function onChange(event) {

}

function onSaveClick(event) {
    let placeIds = Object.keys(worldState.Places);
    placeIds.forEach( (placeId) => {
        const placeElementPrefix = 'place_'+str(placeId);
        const name = document.getElementById(placeElementPrefix+'_name').value
        const longitude = document.getElementById(placeElementPrefix+'_longitude').value
        const latitude = document.getElementById(placeElementPrefix+'_latitude').value
        const altitude = document.getElementById(placeElementPrefix+'_altitude').value
        const timezone = document.getElementById(placeElementPrefix+'_tz').value
        const dst = document.getElementById(placeElementPrefix+'_dst').checked

        worldState = WorldM.reduce('World.Places.update', worldState, placeId, name, latitude, longitude, altitude, timezone, dst);
    });

    placesToUrl();
    paintPlaces();
}

function onAddClick(event) {
    worldState = WorldM.reduce('World.AddPlace', worldState);
    placesToUrl();
}

function onRemoveClick(event) {
    console.log('Remve clicked');
    const buttonId = event.target.id;
    const placeId = buttonId.split('_')[1]
    worldState = WorldM.reduce('World.RemovePlace', worldState, placeId);
    placesToUrl();
}


console.log('---- model ----')
console.log(WorldM)
console.log('---- actions ----')
console.log(WorldM.listActions())
console.log('---- requests ----')
console.log(WorldM.listRequests())

var worldState = WorldM.createEmpty();
worldState = WorldM.reduce('World.setRegion', worldState, 'UTC');

urlToPlaces()

console.log('---- state ----')
console.log(worldState)
console.log('----')

rerender();


function onRegionChange(event) {
    console.log(event.target.selectedOptions[0].value)
    worldState = WorldM.reduce('World.setRegion', worldState, event.target.selectedOptions[0].value);
    rerender();
}

function onTimeZoneChange() {
    console.log(event.target.selectedOptions[0].value)
    worldState = WorldM.reduce('World.setZone', worldState, event.target.selectedOptions[0].value);
    rerender();
}

function renderRegionSelect() {
    var regions = [ h('option', {value:'UTC', selected:('UTC'==worldState.region)},['UTC']) ];
    Object.keys(TimeZonesTree).forEach( (region) => {
            regions.push( h('option', {value:region, selected:(region==worldState.region)},[region]) );
    });
    return h('select', {onChange:onRegionChange }, 
        regions
    );
}

function renderZoneSelect() {
    var region = worldState.region;
    console.log('rengerZone '+region);
    var options = [];
    if (region in TimeZonesTree) {
        options = TimeZonesTree[region].map( (region) => {
            return h('option', {value:region},[region]);
        });
    } 
    return h('select', {onChange:onTimeZoneChange}, 
        options
    );
}

function rerender() {
    const app = h('div', {class:'main'}, [
        h('div', {id:'canvas_container'}, [
            h('h1',{},'Canvas'),
            h('canvas', {id:'canvas', width:300, height:300},[]),
        ]),
        h('div',{id:'home_select_container'}, [
            renderRegionSelect(),
            renderZoneSelect()
        ]),
        WorldM.request('World.renderPlaces', worldState, onRemoveClick, onSaveClick, onAddClick)
    ]);

    render(app, document.body);
    paintPlaces();
}



function getPoint(angle, r, centre) {
    centre = centre || {x:0,y:0};
    return {
        'x': r*Math.sin(angle/180 * Math.PI) + centre.x,
        'y': r*Math.cos(angle/180 * Math.PI) + centre.y
    };
}


function paintPlaces() {
    console.log('paint');
    const canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');

    var now = new Date();
    var day = now.getUTCDate();
    var month = now.getUTCMonth();
    var year = now.getUTCFullYear();

    var nowFrac = (now.getUTCSeconds() + now.getUTCMinutes()*60 + now.getUTCHours()*3600)/86400;

    var times = {};

    var r = 100;
    var centre = {x:150,y:150};

    ctx.setTransform(1,0,0,1,0,0);

    ctx.fillStyle= '#ffffff';
    ctx.fillRect(0,0,300,300); 
    ctx.fillStyle= '#000000';

    ctx.beginPath(); 
    ctx.arc(centre.x, centre.y, r, 0, 2*Math.PI);
    ctx.stroke(); 

    ctx.strokeStyle= '#88f';
    ctx.beginPath();
    ctx.moveTo(centre.x, centre.y - r);
    ctx.lineTo(centre.x, centre.y + r);
    ctx.moveTo(centre.x - r, centre.y);
    ctx.lineTo(centre.x + r, centre.y);
    ctx.stroke();
    ctx.strokeStyle= '#000000';

    var textSize = ctx.measureText('10');
    var textHeight = textSize.actualBoundingBoxAscent + textSize.actualBoundingBoxDescent;

    ctx.fillStyle= '#a91';
    ctx.strokeStyle= '#000000';
    ctx.strokeWidth= '0.4px';
    var nowPoint = getPoint(-nowFrac*360, r+ textHeight*2 + 20, centre);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.translate(nowPoint.x - 10 , nowPoint.y - 10 );
    sun(ctx, 20, 20)
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle= '#000';


    ctx.setTransform(1,0,0,1,0,0);
    ctx.translate(centre.x, centre.y);
    ctx.rotate( -Math.PI);
    for( var i = 1; i <= 24; i++) {
        ctx.rotate( Math.PI/12);
        var text = str(i);
        var textSize = ctx.measureText(text);
        var textHeight = textSize.actualBoundingBoxAscent + textSize.actualBoundingBoxDescent;
        ctx.fillText(text, -textSize.width/2, -r - textHeight);
    }
    ctx.setTransform(1,0,0,1,0,0);

    let placeIds = Object.keys(worldState.Places);
    placeIds.forEach( (placeId) => {
        var placeState = WorldM.request('World.Places.State', worldState, placeId);
        times = PlaceM.request('Place.utcTimes', placeState, year, month, day);
        ctx.setTransform(1,0,0,1,0,0);
        ctx.translate(centre.x, centre.y);
        ctx.rotate( (times.noonAngle)/180 * Math.PI);

        var risePoint = getPoint(-times.hourAngle, r);
        var setPoint = getPoint(times.hourAngle, r);
        var noonPoint = getPoint(times.noonAngle, r);

        ctx.beginPath();
        ctx.moveTo(risePoint.x, risePoint.y);
        ctx.lineTo(setPoint.x, setPoint.y);
        ctx.stroke();

        var textSize = ctx.measureText(placeState.name);
        var textHeight = textSize.actualBoundingBoxAscent + textSize.actualBoundingBoxDescent;
        ctx.fillText(placeState.name, risePoint.x, risePoint.y - textHeight);
    });
}

