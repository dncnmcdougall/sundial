import {h} from './preact.module.mjs'

import {ModelCreator} from './model-reducer.mjs'

import {PlaceM} from './PlaceModel.mjs'

var WorldMC = new ModelCreator('World');
WorldMC.addProperty('region', 'string');
WorldMC.addProperty('zone', 'string');
WorldMC.addChildAsCollection(PlaceM)

WorldMC.addAddActionFor(PlaceM,'AddPlaceWithID')
WorldMC.addAvailableKeyRequestFor(PlaceM, 'AvailablePlaceID')

WorldMC.addAction('setRegion', function(state, region) {
    return Object.assign({}, state, {region:region});
});

WorldMC.addAction('setZone', function(state, zone) {
    return Object.assign({}, state, {zone:zone});
});

WorldMC.addAction('RemovePlace', function(state, placeId) {
    var newState = Object.assign({}, state);
    delete newState.Places[placeId]
    return newState;
});

WorldMC.addAction('AddPlace', function(state) {
    let placeID = this.request('World.AvailablePlaceID',state);
    return this.reduce('World.AddPlaceWithID',state, placeID);
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

WorldMC.addRequest('renderPlaces', function(state, onRemoveClick, onSaveClick, onAddClick) {
    let placeIds = Object.keys(state.Places);

    return h('div', {id:'places'}, [ 
        h('h1',{},'Places'), 
        placeIds.map( (placeId) => {
            return WorldM.request('World.Places.renderForm', state, placeId, onRemoveClick);
        }),
        h('button', {type:'button', onClick: onSaveClick, id:'place_save'},'Save'),
        h('button', {type:'button', onClick: onAddClick, id:'place_add'},'Add')
    ]);
});

export const WorldM = WorldMC.finaliseModel();
