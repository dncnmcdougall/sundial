import {h, Component, render} from './preact.module.mjs'

import {PlaceM} from './PlaceModel.mjs'
import {WorldM} from './WorldModel.mjs'
import {sun} from './sun.mjs'

import {TimeZonesTree} from './timezones.mjs'

const canvasSize = 400;

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
        let places = ['0:Exeter,50.7236,-3.52751,46,Europe,London,1',
            '1:Seoul,37.566,126.9784,38,Asia,Seoul,0',
            '2:Portland,45.52345,-122.67621,15,America,Los_Angeles,0'];
        places.forEach( (place) => { 
            worldState = WorldM.reduce('World.AddPlaceFromStr',worldState, place);
        });
        console.log('default:');
        console.log(worldState);
    }
    var home = parsedUrl.searchParams.get('home')
    if ( home && home.length > 0 ) {
        worldState.home = home
    } else {
        worldState.home = 0;
    }
}

function onThemeChange(event) {
    if (worldState.dark == 'os') {
        rerender();
    }
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
worldState = WorldM.reduce('World.setDark', worldState,'os');

urlToPlaces()

console.log('---- state ----')
console.log(worldState)
console.log('----')

const rootStyle = document.querySelector(':root').style;
const colorSchemeElement = document.getElementById('color-scheme');
const darkMatches = window.matchMedia("(prefers-color-scheme: dark)");
darkMatches.addEventListener('change', onThemeChange);
onThemeChange(darkMatches);
rerender();

function isDark() {
    if ( worldState.dark == 'os' ) {
        return darkMatches.matches;
    } else {
        return worldState.dark == 'dark';
    }
}

function onHomeChange(event) {
    worldState = WorldM.reduce('World.setHome', worldState, event.target.selectedOptions[0].value);
    rerender();
}

function reducePlace(action, placeId, value) {
    worldState = WorldM.reduce('World.Places.'+action, worldState, placeId, value);
    rerender();
}

function reduceWorld(action, value) {
    worldState = WorldM.reduce('World.'+action, worldState, value);
    rerender();
}

function renderToggleSwitch(checked, onChange) {
    return h('label', {class:'switch'},[
        h('input', {type:'checkbox', checked:checked, onChange:onChange},[]),
        h('span',{class:'slider'},[])
    ]);
}

function renderHomeSelect() {
    var regions = [ h('option', {value:-1, selected:(-1==worldState.home)},['UTC']) ];
    Object.keys(worldState.Places).forEach( (placeId) => {
        regions.push( h('option', {value:placeId, selected:(placeId==worldState.home)},[worldState.Places[placeId].name]) );
    });
    return h('div', {id:'home_select_container'}, [
        h('span', {id:'home_title'}, [
            h('h1',{},'Home'), 
            WorldM.request('World.renderDarkSelect', worldState, reduceWorld)
        ]),
        h('select', {onChange:onHomeChange }, 
            regions
        )
    ]);
}

function rerender() {

    console.log('-- rerender --');
    console.log(rootStyle);
    rootStyle.setProperty('--primary-text', (isDark()? 'white' : 'black'));
    rootStyle.setProperty('--secondary-text', (isDark()? 'grey' : 'darkgrey'));
    colorSchemeElement.content = (isDark()? 'dark' : 'light');

    const app = h('div', {class:'main'}, [
        h('div', {id:'canvas_container'}, [
            h('h1',{},'Sundial'),
            h('canvas', {id:'canvas', width:canvasSize, height:canvasSize},[]),
        ]),
        h('div', {id:'home_and_places'}, [
            renderHomeSelect(),
            WorldM.request('World.renderPlaces', worldState, 
                reducePlace, onRemoveClick, onSaveClick, onAddClick)
        ])
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

function paintHomeNight(ctx, centre, r, worldState, year, month, day)
{
    var placeState = WorldM.request('World.Places.State', worldState, worldState.home);
    var homeTimezone = placeState.timezone
    var times = PlaceM.request('Place.utcTimes', placeState, year, month, day);
    ctx.save();

    ctx.setTransform(1,0,0,1,0,0);
    ctx.translate(centre.x, centre.y);
    ctx.rotate( (homeTimezone/12) * Math.PI);
    ctx.rotate( (times.noonAngle)/180 * Math.PI);

    const risePoint = getPoint(180+times.hourAngle, r);
    const setPoint = getPoint(180-times.hourAngle, r);
    const midPoint = {'x': (risePoint.x+setPoint.x)/2, 'y':(risePoint.y+setPoint.y)/2};
    const nightPoint = getPoint(0, r);
    const riseAngle = ((-90-times.hourAngle))/180*Math.PI;
    const setAngle = ((-90+times.hourAngle))/180*Math.PI;

    console.log(times.hourAngle);
    console.log(riseAngle, setAngle)
    console.log(midPoint.x, midPoint.y)
    console.log(risePoint.x, risePoint.y)


    if ( isDark() ) {
        const dayGradient = ctx.createConicGradient(Math.PI, midPoint.x,midPoint.y);
        dayGradient.addColorStop(0, 'crimson');
        dayGradient.addColorStop(0.01, 'orange');
        dayGradient.addColorStop(0.05, 'deepskyblue');

        dayGradient.addColorStop(0.15, 'blue');
        dayGradient.addColorStop(0.35, 'blue');

        dayGradient.addColorStop(0.45, 'deepskyblue');
        dayGradient.addColorStop(0.49, 'orange');
        dayGradient.addColorStop(0.5, 'crimson');

        ctx.fillStyle=dayGradient;
            ctx.beginPath();
            ctx.moveTo(risePoint.x, risePoint.y);
            ctx.arc(0, 0, r, riseAngle, setAngle, false);
        for ( let i =0;i<4;i++) {
            ctx.fill();
        }

    }
    else
{
        const nightGradient = ctx.createConicGradient(0, midPoint.x,midPoint.y);
        nightGradient.addColorStop(0, '#fff');
        nightGradient.addColorStop(0.01, '#888');
        nightGradient.addColorStop(0.05, '#555');

        nightGradient.addColorStop(0.1, '#333');
        nightGradient.addColorStop(0.4, '#333');

        nightGradient.addColorStop(0.45, '#555');
        nightGradient.addColorStop(0.49, '#888');
        nightGradient.addColorStop(0.5, '#fff');

        nightGradient.addColorStop(1, '#fff');

        // const nightGradient = ctx.createLinearGradient(midPoint.x, midPoint.y, nightPoint.x, nightPoint.y);
        // nightGradient.addColorStop(0, '#ddd');
        // nightGradient.addColorStop(0.1, '#888');
        // nightGradient.addColorStop(0.2, '#555');
        // nightGradient.addColorStop(1, '#333');


        ctx.fillStyle=nightGradient;
        for ( let i =0;i<4;i++) {
            ctx.beginPath();
            ctx.moveTo(risePoint.x, risePoint.y);
            ctx.arc(0, 0, r, riseAngle, setAngle, true);
            ctx.lineTo(risePoint.x, risePoint.y);
            ctx.fill();
        }
    }
    ctx.restore();
}


function paintPlace(ctx, centre, r, homeTimezone, placeId, worldState, year, month, day)
{
    var placeState = WorldM.request('World.Places.State', worldState, placeId);
    var times = PlaceM.request('Place.utcTimes', placeState, year, month, day);
    console.log(placeState.name);
    console.log('noon: '+times.noon+' rise: '+times.rise+' set: '+times.set);
    console.log('noon angle: '+times.noonAngle);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.translate(centre.x, centre.y);
    ctx.rotate( (homeTimezone/12) * Math.PI);
    ctx.rotate( (times.noonAngle)/180 * Math.PI);

    var setPoint = getPoint(180-times.hourAngle, r);
    var risePoint = getPoint(180+times.hourAngle, r);

    ctx.beginPath();
    ctx.moveTo(risePoint.x, risePoint.y);
    ctx.lineTo(setPoint.x, setPoint.y);
    ctx.stroke();

    var textSize = ctx.measureText(placeState.name);
    var textHeight = textSize.actualBoundingBoxAscent + textSize.actualBoundingBoxDescent;
    ctx.fillText(placeState.name, risePoint.x+5, risePoint.y - textHeight);
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


    var r = 150;
    var centre = {x:canvasSize/2,y:canvasSize/2};

    ctx.reset();
    ctx.setTransform(1,0,0,1,0,0);


    let homeId = worldState.home;
    var homeTimezone = 0;
    if (homeId >= 0) {
        homeTimezone = WorldM.request('World.Places.State', worldState, homeId).timezone;
        paintHomeNight(ctx, centre, r, worldState, year, month, day);
    }
    console.log('home: '+homeTimezone);

    ctx.beginPath(); 
    ctx.strokeStyle= (isDark()? '#fff': '#000');
    ctx.arc(centre.x, centre.y, r, 0, 2*Math.PI);
    ctx.stroke(); 

    ctx.save()
    ctx.shadowColor= ( isDark()? '#000' : '#fff');
    ctx.shadowBlur= 5;
    ctx.strokeStyle= '#4B4';
    ctx.setLineDash([7,2, 2,2]);
    ctx.beginPath();
    ctx.moveTo(centre.x, centre.y - r);
    ctx.lineTo(centre.x, centre.y + r);
    ctx.moveTo(centre.x - r, centre.y);
    ctx.lineTo(centre.x + r, centre.y);
    ctx.stroke();
    ctx.restore()

    var textSize = ctx.measureText('10');
    var textHeight = textSize.actualBoundingBoxAscent + textSize.actualBoundingBoxDescent;

    ctx.save()
    ctx.fillStyle= '#a91';
    ctx.strokeStyle= (isDark()? '#fff': '#000');
    ctx.strokeWidth= '0.4px';
    var nowPoint = getPoint(-nowFrac*360, r+ textHeight*2 + 20, centre);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.translate(nowPoint.x - 10 , nowPoint.y - 10 );
    sun(ctx, 20, 20)
    ctx.restore()


    ctx.strokeStyle= (isDark()? '#fff': '#000');
    ctx.fillStyle= (isDark()? '#fff': '#000');
    ctx.shadowColor= ( isDark()? '#000' : '#fff');
    ctx.shadowBlur= 5;

    ctx.save()
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
    ctx.restore()

    let placeIds = Object.keys(worldState.Places);
    placeIds.forEach( (placeId) => {
        paintPlace(ctx, centre, r, homeTimezone, placeId, worldState, year, month, day);
    });
}

