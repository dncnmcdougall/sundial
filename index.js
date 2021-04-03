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

    var newUrl = new URL(window.location)

    newUrl.searchParams.set('places',placeStrings.join(';'));
    newUrl.searchParams.set('home',worldState.home);
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
        let place = '0:Exeter,50.7236,-3.5275,46,Europe,London,1';
        worldState = WorldM.reduce('World.AddPlaceFromStr',worldState, place);
        console.log('default:');
        console.log(worldState);
    }
    var home = parsedUrl.searchParams.get('home')
    if ( home && home.length > 0 ) {
        worldState.home = home
    } else {
        worldState.home = -1;
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

        const region = document.getElementById(placeElementPrefix+'_region').value
        const zone = document.getElementById(placeElementPrefix+'_zone').value

        const dst = document.getElementById(placeElementPrefix+'_dst').checked

        worldState = WorldM.reduce('World.Places.update', worldState, placeId, name, 
            latitude, longitude, altitude, 
            region, zone, dst);
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


console.log('---- actions ----')
console.log(WorldM.listActions())
console.log('---- requests ----')
console.log(WorldM.listRequests())

var worldState = WorldM.createEmpty();
worldState = WorldM.reduce('World.setHome', worldState,-1);

urlToPlaces()

console.log('---- state ----')
console.log(worldState)
console.log('----')

rerender();

function onHomeChange(event) {
    worldState = WorldM.reduce('World.setHome', worldState, event.target.selectedOptions[0].value);
    console.log('OnHome:');
    console.log(event.target.selectedOptions[0].value);
    console.log(worldState);
    rerender();
}

function reducePlace(action, placeId, value) {
    console.log('reduce: '+action+': '+value);
    worldState = WorldM.reduce('World.Places.'+action, worldState, placeId, value);
    rerender();
}

function renderHomeSelect() {
    var regions = [ h('option', {value:-1, selected:(-1==worldState.home)},['UTC']) ];
    Object.keys(worldState.Places).forEach( (placeId) => {
            regions.push( h('option', {value:placeId, selected:(placeId==worldState.home)},[worldState.Places[placeId].name]) );
    });
    return h('select', {onChange:onHomeChange }, 
        regions
    );
}

function rerender() {
    const app = h('div', {class:'main'}, [
        h('div', {id:'canvas_container'}, [
            h('h1',{},'Canvas'),
            h('canvas', {id:'canvas', width:300, height:300},[]),
        ]),
        h('div',{id:'home_select_container'}, [
            renderHomeSelect()
        ]),
        WorldM.request('World.renderPlaces', worldState, 
            reducePlace, onRemoveClick, onSaveClick, onAddClick)
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
    const canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');

    var now = new Date();
    var day = now.getUTCDate();
    var month = now.getUTCMonth();
    var year = now.getUTCFullYear();

    console.log(year+'-'+(month+1)+'-'+day);
    var nowFrac = (now.getUTCSeconds() + now.getUTCMinutes()*60 + now.getUTCHours()*3600)/86400;

    var homeTimezone = 0;
    if (worldState.home >= 0 ) {
        homeTimezone = WorldM.request('World.Places.State', worldState, worldState.home).timezone;
    };
    console.log('home: '+homeTimezone);
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
        console.log(placeState.name);
        console.log('noon: '+times.noon+' rise: '+times.rise+' set: '+times.set);
        console.log('noon angle: '+times.noonAngle);
        ctx.setTransform(1,0,0,1,0,0);
        ctx.translate(centre.x, centre.y);
        ctx.rotate( (homeTimezone/12) * Math.PI);
        ctx.rotate( (times.noonAngle)/180 * Math.PI);

        var setPoint = getPoint(180-times.hourAngle, r);
        var risePoint = getPoint(180+times.hourAngle, r);
        var noonPoint = getPoint(180+times.noonAngle, r);

        ctx.beginPath();
        ctx.moveTo(risePoint.x, risePoint.y);
        ctx.lineTo(setPoint.x, setPoint.y);
        // ctx.moveTo((risePoint.x + setPoint.x)/2, (risePoint.y + setPoint.y)/2);
        // ctx.lineTo(noonPoint.x, noonPoint.y);
        ctx.stroke();

        var textSize = ctx.measureText(placeState.name);
        var textHeight = textSize.actualBoundingBoxAscent + textSize.actualBoundingBoxDescent;
        ctx.fillText(placeState.name, risePoint.x, risePoint.y - textHeight);
    });
}

