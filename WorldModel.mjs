import {h} from './preact.module.mjs'

import {ModelCreator} from './model-reducer.mjs'

import {PlaceM} from './PlaceModel.mjs'

var WorldMC = new ModelCreator('World');
WorldMC.addProperty('dark', 'string');
WorldMC.addProperty('home', 'number');
WorldMC.addProperty('timezone', 'number');
WorldMC.addChildAsCollection(PlaceM)

WorldMC.addAddActionFor(PlaceM,'AddPlaceWithID')
WorldMC.addAvailableKeyRequestFor(PlaceM, 'AvailablePlaceID')

WorldMC.addAction('setHome', function(state, home) {
    return Object.assign({}, state, {home:home});
});

WorldMC.addAction('setDark', function(state, dark) {
    return Object.assign({}, state, {dark:dark});
});

WorldMC.addAction('RemovePlace', function(state, placeId) {
    var newState = Object.assign({}, state);
    delete newState.Places[placeId]
    return newState;
});

WorldMC.addAction('AddPlace', function(state) {
    let placeID = this.request('World.AvailablePlaceID',state);
    var newState = this.reduce('World.AddPlaceWithID',state, placeID);
    return this.reduce('World.Places.SetToDefault',newState, placeID);
});

WorldMC.addAction('AddPlaceFromStr', function(state, line) {
    if ( line.length == 0 ) {
        return state;
    }
    var placeId = line.split(':')[0]
    var newState = this.reduce('World.AddPlaceWithID',state, placeId);
    newState = this.reduce('World.Places.fromStr',newState, placeId, line);
    return newState;
});

WorldMC.addRequest('renderPlaces', function(state, 
    reduce, onRemoveClick, onSaveClick, onAddClick) {
        let placeIds = Object.keys(state.Places);

        return h('div', {id:'places'}, [ 
            h('h1',{},'Places'), 
            placeIds.map( (placeId) => {
                return WorldM.request('World.Places.renderForm', state, placeId, 
                    reduce, onRemoveClick);
            }),
            h('button', {type:'button', onClick: onSaveClick, id:'place_save'},'Save'),
            h('button', {type:'button', onClick: onAddClick, id:'place_add'},'Add')
        ]);
    });

WorldMC.addRequest( 'renderDarkSelect', function(state, reduce, inputProp) {
    let options = {System:'os', Dark:'dark', Light:'light'};
    let optionElements = Object.keys(options).map( (label) => {
        const checked = (options[label] ==  state.dark);
        return h('label', {
            class: 'dark-select-label'
        }, [ 
            h('input', Object.assign({
                type:'radio',
                class:'dark-select-radio',
                name:'dark-select',
                value:options[label], 
                checked:checked
            }, inputProp),[]),
            h('span', Object.assign({
                alt:label,
                class:'dark-select-span',
                style:'mask-image:url(/theme-'+options[label]+'.svg);',
            }, inputProp),[])
        ]);
    });
    return h('span', 
        Object.assign({
            id:'dark_select', 
            onChange:(event)=>{reduce('setDark', event.target.value);}
        } , inputProp), 
        [optionElements])
});

export const WorldM = WorldMC.finaliseModel();
