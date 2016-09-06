// Here's where we're calling the google maps API. No API key needed yet, b/c
// we're not using it very much. If we started using it enough that we wanted
// to track our usage, we should get an API key. More info:
// https://developers.google.com/maps/documentation/javascript/tutorial#api_key
//
// And that "async!" is from the async plugin.
// https://github.com/millermedeiros/requirejs-plugins

ChartMarker.prototype = new google.maps.OverlayView;
ChartMarker.prototype.onAdd = function() {
    $( this.getPanes().overlayMouseTarget ).append( this.$div );
};

ChartMarker.prototype.onRemove = function() {
    this.$div.remove();
};

ChartMarker.prototype.draw = function() {
    var marker = this;
    var projection = this.getProjection();
    var position = projection.fromLatLngToDivPixel( this.get('position') );

    this.$div.css({
        left: position.x,
        top: position.y,
        display: 'block'
    });

    this.$inner
        .html( '<img src="' + this.get('image') + '"/>' )
        .click( function( event ) {
            var events = marker.get('events');
            events && events.click( event );
        });

    this.chart = new google.visualization.PieChart( this.$inner[0] );
    this.chart.draw( this.get('chartData'), this.get('chartOptions') );
};

function ChartMarker( options ) {
    scaleFactor = 0.5;
    lsx = '-'+(options.width*scaleFactor)+'px';
    lsy = '-'+(options.height*scaleFactor)+'px';
    this.setValues( options );
    this.$inner = $('<div>').css({
        position: 'relative',
        left: '-'+(options.width*scaleFactor)+'px',
        top: '-'+(options.height*scaleFactor)+'px',
        width: options.width+'px',
        height: options.height+'px',
        fontSize: '1px',
        lineHeight: '1px',
        padding: '2px',
        backgroundColor: 'transparent',
        cursor: 'default'
    });
    this.$div = $('<div>')
        .append( this.$inner )
        .css({
            position: 'absolute',
            display: 'none'
        });
}


define(['maplabel'], function () {
    return function (canvas, dataPanel) {
        var latitude = 40.4417, // default pittsburgh downtown center
            longitude = -80.0000;
        var markers = [];
        var sentidots = [];
        var chartMarkerList = [];
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


       
        var createNameMarker = function(pos,nghd){
            var marker = new MarkerWithLabel({
                position: pos,
                map: map,
                icon:'http://maps.gstatic.com/mapfiles/transparent.png', 
                    //only label is showing 
                labelContent: nghd,
                labelAnchor: new google.maps.Point(25,0)
            });
            google.maps.event.addListener(marker,'click',function(){
                if (infowindows_names[nghd] != undefined) {
                    infowindows_names[nghd].open(map,marker);
                } else {
                    $.ajax({
                        type: "get",
                        data: {nghd:nghd},
                        url: SCRIPT_ROOT + "/get-words-emojis-for-nghd",
                        success: function(response) {
                            top_words_and_emojis = response["top_words_and_emojis"];
                            topTopics = top_words_and_emojis["top words"];
                            // topEmojis = top_words_and_emojis["top emojis"];
                            // topColor = top_words_and_emojis["color"];
                            topsentiment = top_words_and_emojis["sentivalue"];
                            toptotalcnt = top_words_and_emojis["totalcnt"];
                            topposcnt = top_words_and_emojis["poscnt"];
                            topnegcnt = top_words_and_emojis["negcnt"];
                            // document.getElementById("instructions").style.display = 'none';
                            document.getElementById("Dynamic-tab").style.display = 'block';
                            var topWordsString = setTxtTitle(nghd);
                            topWordsString += setTxtBody(nghd, topTopics, topsentiment, toptotalcnt, topposcnt, topnegcnt);
                            topWordsString += setTxtFoot();
                            // for (var i=0; i<topTopics.length; i++){
                            //     topWordsString = topWordsString + "<div style='color:"+topColor[i]+"'>"+topTopics[i]+"</div>"
                            // }
                            document.getElementById("Dynamic-tab").innerHTML = topWordsString;

                            //  var topEmojisString = "";
                            // // for (var i=0;i<topEmojis.length;i++){
                            // //     topEmojisString = topEmojisString + topEmojis[i];
                            // // }
                            // var infowindow = new google.maps.InfoWindow({
                            //     content:topWordsString
                            // });
                            // infowindow.open(map,marker);
                            // infowindows_names[nghd] = infowindow;
                        },
                        error: function () {
                            document.getElementById("Dynamic-tab").innerHTML = setTxtTitle(nghd)+"No data for this neighborhood.";
                            console.log("ajax request failed for " + this.url);
                        }
                    });
                }
            });
            return marker;
        };

        var plotNghdNames = function(nghd_names){
            for (var nghd in nghd_names){
                coords = nghd_names[nghd];
                lat = coords[0];
                lon = coords[1];
                var marker = createNameMarker(new google.maps.LatLng(lat,lon),nghd);
                markers.push(marker);
            }
        };

        var createEmojiMarker = function(pos,nghd,topEmojis){
            var topEmojisString = "";
            for (var i=0;i<topEmojis.length;i++){
                topEmojisString = topEmojisString + topEmojis[i];
            }
            var marker = new MarkerWithLabel({
                position: pos,
                map: map,
                title: nghd,
                icon:'http://maps.gstatic.com/mapfiles/transparent.png', 
                    //only label is showing 
                labelContent: topEmojisString,
                labelAnchor: new google.maps.Point(25,0),
                labelStyle: {"font-size":"130%"}
            });
            google.maps.event.addListener(marker,'click',function(){
                if (infobubbles_emojis[nghd] != undefined) {
                    infobubbles_emojis[nghd].open(map,marker);
                } else {
                    $.ajax({
                        type: "get",
                        data:{nghd: nghd},
                        url: SCRIPT_ROOT + "/get-tweets-per-emoji",
                        success: function(response) {
                            tweets_per_emoji = response["tweets_per_emoji"];
                            var infobubble = new InfoBubble({
                                maxWidth:600,
                                maxHeight:300
                            });
                            for (var i=0;i<topEmojis.length;i++){
                                emoji = topEmojis[i];
                                var tweets = "";
                                for (var j=0;j<tweets_per_emoji[emoji].length;j++){ 
                                    tweets = tweets + tweets_per_emoji[emoji][j] + "<br>";
                                }
                                infobubble.addTab(emoji,tweets);
                            }
                            infobubble.open(map,marker);
                            infobubbles_emojis[nghd] = infobubble;
                        },
                        error: function () {
                            console.log("ajax request failed for " + this.url);
                        }
                    });
                }
            });
            return marker;
        };

        var plotNghdEmojis = function(top_emojis_per_nghd){
            for (var nghd_info in top_emojis_per_nghd){
                if (top_emojis_per_nghd.hasOwnProperty(nghd_info)){
                    var coords = JSON.parse(nghd_info);
                    var lat = coords[0];
                    var lon = coords[1];
                    var nghd = coords[2]; //nghd looks like 'nghd' right now
                    nghd = nghd.substring(1,nghd.length-1);
                    var marker = createEmojiMarker(new google.maps.LatLng(lat,lon), 
                                                nghd,top_emojis_per_nghd[nghd_info]);
                    markers.push(marker);
                }
            }
        };  
        
        var createWordMarker = function(pos,nghd,topWords,topColor){
            var topWordsString = "";
            for (var i=0; i<topTopics.length; i++){
                topWordsString = topWordsString + "<div style='color:"+topColor[i]+"'>"+topTopics[i]+"</div>"
                // + topWords[i] + "<br>"
            }
            var marker = new MarkerWithLabel({
                position: pos,
                map: map,
                title: nghd,
                icon:'http://maps.gstatic.com/mapfiles/transparent.png', 
                    //only label is showing 
                labelContent: topWordsString,
                labelAnchor: new google.maps.Point(25,0)
             });
            
            /*google.maps.event.addListener(marker, 'mouseover', function() {
                marker.set("labelStyle",{"font-weight":700,"font-size":"120%"});
            });
            google.maps.event.addListener(marker, 'mouseout', function() {
                marker.set("labelStyle",{"font-weight": 400,"font-size":"100%"});
            });*/

            google.maps.event.addListener(marker,'click',function(){
                if (infobubbles_words[nghd] != undefined) {
                    infobubbles_words[nghd].open(map,marker);
                } else {
                    $.ajax({
                        type: "get",
                        data:{nghd: nghd},
                        url: SCRIPT_ROOT + "/get-tweets-per-word",
                        success: function(response) {
                            tweets_per_word = response["tweets_per_word"];
                            var infobubble = new InfoBubble({
                                maxWidth:600,
                                maxHeight:300
                            });
                            for (var i=0; i<topTopics.length; i++){
                                word = topTopics[i];
                                var tweets = "";
                                for (var j=0;j<tweets_per_word[word].length;j++){ 
                                    tweets = tweets + tweets_per_word[word][j] + "<br>";
                                }
                                infobubble.addTab(word,tweets);
                            }
                            infobubble.open(map,marker);
                            infobubbles_words[nghd] = infobubble;
                        },
                        error: function () {
                            console.log("ajax request failed for " + this.url);
                        }
                    });
                }
            });
            return marker;
        };

        var plotWords = function(top_words_per_nghd){
            for (var nghd_info in top_words_per_nghd){
                if (top_words_per_nghd.hasOwnProperty(nghd_info)){
                    var coords = JSON.parse(nghd_info);
                    var lat = coords[0];
                    var lon = coords[1];
                    var nghd = coords[2]; //nghd looks like 'nghd' right now
                    nghd = nghd.substring(1,nghd.length-1);
                    var marker = createWordMarker(new google.maps.LatLng(lat,lon),
                                               nghd,top_words_per_nghd[nghd_info][0],top_words_per_nghd[nghd_info][1]);
                    markers.push(marker);
                } 
            }
        };

        var drawPolygon = function(coords){
            //coords currently in form [[[#,#],[#,#],[#,#]]]                
            coords = coords[0];
            var polygonCoords = [];
            for (var i = 0; i < coords.length; i++){
                polygonCoords.push(new google.maps.LatLng(coords[i][1],coords[i][0]));
            }
            //Construct the polygon.
            poly = new google.maps.Polygon({
                paths: polygonCoords,
                strokeColor: '#000066',
                strokeOpacity: 0.3,
                strokeWeight: 2,
                fillColor: '#000066',
                fillOpacity: 0.05
             });
             poly.setMap(map);
             polygons.push(poly);
        };

        var api =  {
            clearMap: function () {
                for(var i = 0; i < markers.length; i++) {
                    markers[i].setMap(null);
                }
                markers = [];
                for(var i = 0; i < sentidots.length; i++) {
                    sentidots[i].setMap(null);
                }
                sentidots = [];
                for(var i = 0; i < chartMarkerList.length; i++) {
                    chartMarkerList[i].setMap(null);
                }
                chartMarkerList = [];
                for(var nghd in infobubbles_words) {
                    infobubbles_words[nghd].close();
                }
                for(var nghd in infobubbles_emojis) {
                    infobubbles_emojis[nghd].close();
                }
                document.getElementById("legendDiv").style.display="none";
            },
            clearWholeMap: function (){
                api.clearMap();
                for(var i = 0; i < polygons.length; i++) {
                    polygons[i].setMap(null);
                }
            },
            plotNghdNames: function(nghd_names){
                map.setZoom(13);
                api.clearMap();
                plotNghdNames(nghd_names); 
            },  
            plotNghdEmoji: function(top_emojis_per_nghd){
                map.setZoom(13);
                api.clearMap();
                plotNghdEmojis(top_emojis_per_nghd);
            },
            plotNghdWords: function(top_words_per_nghd){
                map.setZoom(14);
                api.clearMap();
                plotWords(top_words_per_nghd);
            },
            drawNghdBounds: function(nghd_bounds){
                if (polygons.length==0){
                    for (var nghd in nghd_bounds) {
                        if (nghd_bounds.hasOwnProperty(nghd)){
                            drawPolygon(nghd_bounds[nghd]);
                        }
                    }
                }
                else{
                    for(var i = 0; i < polygons.length; i++) {
                        polygons[i].setMap(map);
                    }
                }
            },
            hideNghdBounds: function(){
                for(var i = 0; i < polygons.length; i++) {
                    polygons[i].setMap(null);
                }
            },
            showTopicNghdSummary: function(sumtopic, summarData, locationData){
                drawTopicNghdSummary(sumtopic, summarData, locationData);
            },
            drawSentiDots: function (sentidata) {
                for (var i=0; i<sentidata.length; i++){
                    var cityCircle = new google.maps.Circle({
                        strokeColor: sentidata[i][2],
                        strokeOpacity: 1,
                        strokeWeight: 2,
                        fillColor: sentidata[i][2],
                        fillOpacity: 1,
                        map: map,
                        center: {lat: sentidata[i][0], lng: sentidata[i][1]},
                        radius: 50
                    });
                    sentidots.push(cityCircle);
                    cityCircle.setMap(map)
                }
            }
        };
        return api;

        function setTxtTitle (nghd) {
            return "<div id=\"info-top-bar\"><h3 id=\"info-title\"><div id=\"livehood-num\">" +
                    nghd +
                    "</div></h3></div>";
        }

        function setTxtBody(nghd, topTopics, topicSentiments, totaltweetnums, positivenums, negtivenums) {
            thisContent = "<ul class=\"dropdown-menu scrollable-menu\" role=\"menu\"  "+
                "style=\"display: block; position: static; margin-bottom: 5px; width: 100%; height: 400px; overflow: auto\">";
            for(var i = 0; i < topTopics.length; i++) {
                thisContent += setTxtEntry(nghd, topTopics[i], topicSentiments[i], totaltweetnums[i], positivenums[i], negtivenums[i]);
            }
            return thisContent;
        }



        // function setTxtEntry(nghd, topic, sentiment, totalnum, posnum, negnum) {
        //     thisContent = "<li class=\"dropdown-submenu\"><div class=\"divmargin\" onclick=\"getmymodal(\'" + nghd + "\',\'" + topic + "\')\"><h4 class=\"FirstUpper\">" + topic;
        //     thisContent += "</h4>";
        //     thisContent += "<table class=\"table table-condensed\" id=\"topicTable\"><tbody>";
        //     thisContent += "<tr><td>Total tweets</td><td>" + totalnum;
        //     thisContent += "</td></tr><tr><td>Positive tweets</td><td>" + posnum;
        //     thisContent += "</td></tr><tr><td>Negative tweets</td><td>" + negnum;
        //     thisContent += "</td></tr>";
        //     thisContent += "</tbody></table></div></li><li class=\"divider\"></li>";
        //     return thisContent;
        // }


        function setTxtEntry(nghd, topic, sentiment, totalnum, posnum, negnum) {
            thisContent = "<li class=\"dropdown-submenu\"><div class=\"divmargin\" onclick=\"getmymodal(\'" + nghd + "\',\'" + topic + "\')\"><h4 class=\"FirstUpper\">" + topic;
            thisContent += "</h4><div id=\"chart_div\" style=\"width:200px; height:50px\" ></div>";
            thisContent += "</div></li><li class=\"divider\"></li>";
            return thisContent;
        }

        function setTxtFoot() {
            return "</ul>";
        }


        // _______________________split line--------------


        function drawTopicNghdSummary(sumtopic, summarData, locationData) {
            for (var nghd in summarData)
            {
                if (summarData[nghd].count == 0)
                    continue;
                if (locationData.hasOwnProperty(nghd) == false)
                    continue;
                tmpmarkers = [locationData[nghd][0], locationData[nghd][1], Math.round(summarData[nghd].possenti *100),
                    Math.abs(Math.round(summarData[nghd].negsenti *100))];
                // console.log(tmpmarkers);
                // var location = new google.maps.LatLng(locationData[nghd][0], locationData[nghd][1]);
                // var data = google.visualization.arrayToDataTable([
                //     [ 'Task', 'Hours per Day' ],
                //     [ 'Work', Math.round(summarData[nghd].possenti *100)],
                //     [ 'Eat', Math.round(summarData[nghd].negsenti *100)]
                // ]);
                var location = new google.maps.LatLng(tmpmarkers[0], tmpmarkers[1]);
                var data = google.visualization.arrayToDataTable([
                    [ 'Task', 'Hours per Day' ],
                    [ 'Work', tmpmarkers[2]],
                    [ 'Eat', tmpmarkers[3]]
                ]);
                var options = {
                    fontSize: 8,
                    backgroundColor: 'transparent',
                    legend: {position: 'none'},
                    enableInteractivity: false,
                    slices: {0: {color: 'blue'}, 1:{color: 'red'}}

                };
                para = nghd;
                (function(location,data, param){
                    var marker = new ChartMarker({
                        map: map,
                        position: location,
                        width: Math.round(Math.sqrt(summarData[nghd].count)*5+25),
                        height: Math.round(Math.sqrt(summarData[nghd].count)*5+25),
                        chartData: data,
                        chartOptions: options,
                        events: {
                            click: function( event ) {
                                // drawChart(marker,data)
                                // alert(param+" "+sumtopic);
                                if (infowindows_names[nghd] != undefined) {
                                    infowindows_names[nghd].open(map,marker);
                                } else {
                                    $.ajax({
                                        type: "get",
                                        data: {nghd:param, topic:sumtopic},
                                        url: SCRIPT_ROOT + "/get-tfidf-for-nghd",
                                        success: function(response) {
                                            // respond = JSON.parse(response);
                                            // console.log(respond);
                                            getmymodalSum(param, sumtopic, response["nghd"]);
                                        },
                                        error: function () {
                                            document.getElementById("Dynamic-tab").innerHTML = setTxtTitle(nghd)+"No data for this neighborhood.";
                                            console.log("ajax request failed for " + this.url);
                                        }
                                    });
                                }
                            }
                        }

                    });
                    chartMarkerList.push(marker);
                })(location,data,para);
            }

            document.getElementById("legendDiv").style.display="block";
        }
        // google.maps.event.addDomListener(window, 'load', initialize);



    };
});
