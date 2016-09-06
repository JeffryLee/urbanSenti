var SCRIPT_ROOT = window.location.href;
SCRIPT_ROOT = SCRIPT_ROOT.substring(0,SCRIPT_ROOT.length-1);
define(['jquery', 'app/TweetMap'], function ($, TweetMap) {
    $(document).ready(function () {
        var tweetMap = new TweetMap(document.getElementById('map-canvas'), document.getElementById("data-panel"));

       $.ajaxSetup({
            beforeSend: function () {
                $("body").addClass("loading");
            },
            complete: function () {
                $("body").removeClass("loading");
            }
        });

        //on page load
        $("#get-nghd-names-btn").addClass('active');
       $.ajax({
            type: "get",
            url: SCRIPT_ROOT + "/get-nghd-names",
            success: function (response) {
                tweetMap.plotNghdNames(response["nghds_to_centralPoint"]);
            },
            error: function () {
                console.log("ajax request failed for " + this.url);
            }
        });

        function clearActiveButtons(){
            $("#get-nghd-names-btn").removeClass('active');
            $("#get-emojis-per-nghd-btn").removeClass('active'); 
            $("#get-words-per-nghd-btn").removeClass('active'); 
        }
             
        $("#get-nghd-names-btn").on("click",function () {
            document.getElementById("topicContainer").style.display = "none";
            document.getElementById("Dynamic-tab").style.display = "none";
            clearActiveButtons();
            $("#get-nghd-names-btn").addClass('active');
            $.ajax({
                type: "get",
                url: SCRIPT_ROOT + "/get-nghd-names",
                success: function (response) {
                    tweetMap.plotNghdNames(response["nghds_to_centralPoint"]);
                    document.getElementById("instructions").innerHTML =
                    "Click on a neighborhood name to see hot topics in it.";
                },
                error: function () {
                    console.log("ajax request failed for " + this.url);
                }
            });
        });

        $("#get-words-per-nghd-btn").on("click",function () {
            clearActiveButtons();
            document.getElementById("instructions").innerHTML = "Click on a topic name to see related tweets distribution.";
            document.getElementById("topicContainer").style.display = "block";
            document.getElementById("Dynamic-tab").style.display = "none";
            tweetMap.clearMap();
        });

        $("#get-emojis-per-nghd-btn").on("click",function () {
            clearActiveButtons();
            $("#get-emojis-per-nghd-btn").addClass('active');
            $.ajax({
                type: "get",
                url: SCRIPT_ROOT + "/get-emojis-per-nghd",
                success: function (response) {
                    tweetMap.plotNghdEmoji(response["top_emojis_per_nghd"]);
                    document.getElementById("instructions").innerHTML =
                    "Click on a set of emojis to see the tweets they came from.";
                },
                error: function () {
                    console.log("ajax request failed for " + this.url);
                }
            });
        });
        
        $("#clear-map-btn").on("click",function () {
            clearActiveButtons();
            tweetMap.clearWholeMap();
            document.getElementById("show-nghd-bounds-btn").innerHTML = 
                                          "Show Neighborhood Boundaries";
            document.getElementById("instructions").innerHTML = "";
        });
        
        var loaded_bounds_already = false;
        $("#show-nghd-bounds-btn").on("click",function () {
            if (document.getElementById("show-nghd-bounds-btn").innerHTML 
                == "Show Neighborhood Boundaries"){
                if (loaded_bounds_already){
                    tweetMap.drawNghdBounds([]);
                    document.getElementById("show-nghd-bounds-btn").innerHTML 
                                                 = "Hide Neighborhood Boundaries";
                }
                else{
                    $.ajax({
                        type: "get",
                        url: SCRIPT_ROOT + "/get-nghd-bounds",
                        success: function(response) {
                          loaded_bounds_already = true;
                          tweetMap.drawNghdBounds(response["bounds"]);
                          //replace with hide nghd bounds btn
                          document.getElementById("show-nghd-bounds-btn").innerHTML 
                                                 = "Hide Neighborhood Boundaries";
                        },
                        error: function () {
                            console.log("ajax request failed for " + this.url);
                        }
                    });
                }
            }
            else{
                tweetMap.hideNghdBounds();
                document.getElementById("show-nghd-bounds-btn").innerHTML 
                                            = "Show Neighborhood Boundaries";
            }
        });
        
        $(".topicEntry").on("click", function () {
            var obj=event.srcElement;
            topic = obj.innerHTML;
            tweetMap.clearWholeMap();
            $("#get-words-per-nghd-btn").addClass('active');
            $.ajax({
                type: "get",
                data: {topic:topic},
                url: SCRIPT_ROOT + "/get-senti-per-topic",
                success: function (response) {
                    tweetMap.showTopicNghdSummary(topic, response["tweets_per_topic"],response["nghds_to_centralPoint"]);
                    // plotsafety(document.getElementById('map-canvas'), );
                    // console.log(response["tweets_per_topic"][0]);
                },
                error: function () {
                    console.log("ajax request failed for " + this.url);
                }
            });
        });


    });
});

function getmymodal(nghd, topTopics){
    $.ajax({
        type: "get",
        data:{nghd: nghd},
        url: SCRIPT_ROOT + "/get-tweets-per-word",
        success: function(response) {
            tweets_per_word = response["tweets_per_word"];
            var poscontent = [];
            var possenti = [];
            var negcontent = [];
            var negsenti = [];

            var tmpvar = [];
            for (var j=0;j<tweets_per_word[topTopics].length;j++){
                tmpvar = tweets_per_word[topTopics][j].split("&a*a&");
                if (parseFloat(tmpvar[1])>0) {
                    poscontent.push(tmpvar[0]);
                    possenti.push(tmpvar[1]);
                }
                else {
                    negcontent.push(tmpvar[0]);
                    negsenti.push(tmpvar[1]);
                }
            }

            document.getElementById("myModalBody").innerHTML = buildModalHeader()+buildModalTable("positive",poscontent,possenti," fade in active")
                +buildModalTable("negative",negcontent,negsenti,"")+buildModalFoot();
        },
        error: function () {
            console.log("ajax request failed for " + this.url);
        }
    });
    // $('#prizePopup').modal('show');
    document.getElementById("myModalLabel").innerHTML = "Tweets about "+topTopics;

    $("#myModal").modal();
}

function buildModalHeader() {
    return "<ul class=\"nav nav-tabs\"><li class=\"active\"><a data-toggle=\"tab\" href=\"#positivetweet\" onclick=\"clearDiv2\">Positive</a></li>"+
        "<li><a data-toggle=\"tab\" href=\"#negativetweet\" onclick=\"clearDiv2\">Negative</a></li></ul><div class=\"tab-content\">";
}

function buildModalTable(tweetstate, tweetcontent, tweetsenti, fadeoption) {
    thisContent = "<div id=\""+tweetstate+"tweet\" class=\"tab-pane"+fadeoption+"\">"+
            "<div id=\""+tweetstate+"tweet1\">"+ buildTableContent(tweetcontent, tweetsenti);
    thisContent+="</div>" + "<div id=\""+tweetstate+"tweet2\"></div>"+
        "</div>";
    return thisContent;
}

function buildTableContent(tweetcontent, tweetsenti) {
    thisContent = "<table class=\"table table-condensed\"><tbody>";
    for (var i=0; i<tweetcontent.length; i++)
    {
        thisContent += "<tr><td>"+tweetcontent[i]+"</td><td>"+tweetsenti[i]+"</td></tr>";
    }
    thisContent += "</tbody></table>";
    return thisContent;
}

function buildModalFoot() {
    return "</div>";
}


function getmymodalSum(nghd, topTopics, mapData){


    // $('#prizePopup').modal('show');
    document.getElementById("myModalLabel").innerHTML = "Keywords about "+topTopics+" in "+nghd;
    // tmp11 = mapData.nghd;
    // thm12 = tmp11.positive;
    // console.log(mapData);
    // console.log(mapData["positive"].length);



    if (!mapData.hasOwnProperty("negative") || !mapData["negative"].hasOwnProperty("term") || mapData["negative"]["term"].length<5) {
        document.getElementById("negativetweet1").innerHTML = "THe number of keywords are too few to be shown in word cloud";
    }
    else {
        func(false, nghd, topTopics, mapData["negative"]["term"], mapData["negative"]["value"]);
        // document.getElementById("negativetweet3").innerHTML = nghd + " " + topTopics + " neg";
        document.getElementById("negativetweet2").style.display = "none";
    }

    if (!mapData.hasOwnProperty("positive") || !mapData["positive"].hasOwnProperty("term") || mapData["positive"]["term"].length<5) {
        document.getElementById("positivetweet1").innerHTML = "THe number of keywords are too few to be shown in word cloud";
    }
    else {
        func(true, nghd, topTopics, mapData["positive"]["term"], mapData["positive"]["value"]);
        // document.getElementById("negativetweet3").innerHTML = nghd + " " + topTopics + " pos";
        document.getElementById("positivetweet2").style.display = "none";
    }

    $("#myModal").modal();
}

