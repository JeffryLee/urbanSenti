function plotegg(){
    
}
function plotsafety(canvas, data) {
    var latitude = 40.4417, // default pittsburgh downtown center
        longitude = -80.0000;
    var markers = [];
    var infowindows_names = {};
    var infobubbles_words = {};
    var infobubbles_emojis = {};
    var polygons = [];
    var mapOptions = {
        center: {lat: latitude, lng: longitude},
        zoom: 13,
        disableDefaultUI: true,
        zoomControl:true,
        styles:
            [
                {"elementType": "labels","stylers": [{ "visibility": "off" }]},
                {"featureType": "road","elementType": "geometry",
                    "stylers": [{ "visibility": "simplified" }]},
                // {"featureType": "poi","stylers": [{ "visibility": "off" }]},
                {"featureType": "landscape","stylers": [{ "visibility": "off"}]}
            ]
    };
    var map = new google.maps.Map(canvas, mapOptions);
    for (var i=0; i<data.length; i++){
        var cityCircle = new google.maps.Circle({
            strokeColor: data[i][2],
            strokeOpacity: 1,
            strokeWeight: 2,
            fillColor: data[i][2],
            fillOpacity: 1,
            map: map,
            center: {lat: data[i][0], lng: data[i][1]},
            radius: 50
        });
        cityCircle.setMap(map)
    }

}