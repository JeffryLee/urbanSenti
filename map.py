#!/usr/bin/env python

import os, json, geojson, csv, traceback, ujson, argparse, random
from collections import Counter, defaultdict
from flask import Flask, render_template, request, jsonify, json, url_for, flash, redirect
from flask_debugtoolbar import DebugToolbarExtension
from flask.ext.compress import Compress
from csv import DictWriter,DictReader
import geojson
import sys,cgi
import re
from fuzzywuzzy import fuzz
from fuzzywuzzy import process
csv.field_size_limit(sys.maxsize)

SITE_ROOT = os.path.realpath(os.path.dirname(__file__))
# general flask app settings
app = Flask('map')
app.secret_key = 'some_secret'
Compress(app)

# This call kicks off all the main page rendering.
@app.route('/')
def index():
    return render_template('main.html')

@app.route('/get-nghd-bounds', methods=['GET'])
def get_nghd_bounds():
    bounds = {}
    nghds = geojson.load(open('geodata/Pittsburgh_Neighborhoods.json'))
    nghd_features = nghds['features']
    for nghd in nghd_features: 
        nghd_name = nghd["properties"]["HOOD"]
        bounds[nghd_name] = nghd["geometry"]["coordinates"]    
    boroughs = geojson.load(open('geodata/Allegheny_Munis.json'))
    borough_features = boroughs['features']
    for borough in borough_features:
        borough_name = borough["properties"]["LABEL"]
        if borough_name=="Pittsburgh": continue
        bounds[borough_name] = borough["geometry"]["coordinates"]
    return jsonify(bounds=bounds)

@app.route('/get-nghd-names/', methods=['GET'])
def get_nghd_names():
    nghd_words = json.load(open('outputs/nghd_words.json'))

    nghds_to_centralPoint = {}
    for line in DictReader(open('nghd_central_point.csv')):
        nghd = line['nghd']
        if nghd in nghd_words:
            if nghd=="Outside Pittsburgh": continue
            if nghd=="Pittsburgh": continue 
            nghds_to_centralPoint[line['nghd']]=[float(line['lat']),float(line['lon'])]
    
    return jsonify(nghds_to_centralPoint=nghds_to_centralPoint)

@app.route('/get-words-emojis-for-nghd', methods=['GET'])
def get_words_emojis_for_nghd():
    nghd = request.args['nghd'].replace("'","")
    top_words_and_emojis = {}
    nghd_words = json.load(open('outputs/nghd_words.json'))
    top_words_and_emojis["top words"] = nghd_words[nghd]["topics"]
    nghd_emojis = json.load(open('outputs/nghd_emojis.json'))
    top_words_and_emojis["top emojis"] = nghd_emojis[nghd]["top emojis"]
    # top_words_and_emojis["color"] = []
    top_words_and_emojis["sentivalue"] = []
    top_words_and_emojis["totalcnt"] = []
    top_words_and_emojis["poscnt"] = []
    top_words_and_emojis["negcnt"] = []
    for worditer in top_words_and_emojis["top words"]:
        top_words_and_emojis["sentivalue"].append(nghd_words[nghd]["topic data"][worditer]["value"])
        top_words_and_emojis["totalcnt"].append(nghd_words[nghd]["topic data"][worditer]["count"])
        top_words_and_emojis["poscnt"].append(nghd_words[nghd]["topic data"][worditer]["poscnt"])
        top_words_and_emojis["negcnt"].append(nghd_words[nghd]["topic data"][worditer]["negcnt"])
    return jsonify(top_words_and_emojis=top_words_and_emojis)


@app.route('/get-tfidf-for-nghd', methods=['GET'])
def get_tfidf_for_nghd():
    nghd = request.args['nghd'].replace("'","")
    topic = request.args['topic'].replace("'","")
    nghd_tfidf = json.load(open('outputs/tfidf.json'))
    return jsonify(nghd=nghd_tfidf[nghd][topic])


@app.route('/get-emojis-per-nghd', methods=['GET'])
def get_emojis_per_nghd():
    #map nghd name to coordinates
    nghds_to_centralPoint = {}
    for line in DictReader(open('nghd_central_point.csv')):
        nghds_to_centralPoint[line['nghd']]=[float(line['lat']),float(line['lon'])]
       
    top_emojis_per_nghd = defaultdict(list)
    nghd_emojis = json.load(open('outputs/nghd_emojis.json'))
    for nghd in nghd_emojis:
        if nghd=="Outside Pittsburgh": continue
        if nghd=="Pittsburgh": continue
        key = nghds_to_centralPoint[nghd]
        key.append("\'"+nghd.encode('utf-8')+"\'")
        top_emojis_per_nghd[str(key)] = nghd_emojis[nghd]["top emojis"]
    return jsonify(top_emojis_per_nghd=top_emojis_per_nghd)  

@app.route('/get-tweets-per-emoji', methods=['GET'])
def get_tweets_per_emoji():
    nghd = request.args['nghd'].replace("'","")
    tweet_file_name = 'outputs/tweets_per_nghd_emoji.json'
    tweets_per_nghd_emojis = json.load(open(tweet_file_name))
    tweets_per_emoji = tweets_per_nghd_emojis[nghd]
    return jsonify(tweets_per_emoji=tweets_per_emoji)  

@app.route('/get-words-per-nghd/', methods=['GET'])
def get_words_per_nghd():
    #map nghd name to coordinates    
    nghds_to_centralPoint = {}
    for line in DictReader(open('nghd_central_point.csv')):
        nghds_to_centralPoint[line['nghd']]=[float(line['lat']),float(line['lon'])]
    top_words_per_nghd = defaultdict(list)
    nghd_words = json.load(open('outputs/nghd_words.json'))
    for nghd in nghd_words:
        if nghd=="Outside Pittsburgh": continue
        if nghd=="Pittsburgh": continue
        #key is [lat,lon,nghd]
        key = nghds_to_centralPoint[nghd]
        key.append("\'"+nghd.encode('utf-8')+"\'")
        tmpline = [0]*2
        tmpline[0] = nghd_words[nghd]["topics"]
        tmpline[1] = []
        for iterword in nghd_words[nghd]["topics"]:
            tmpline[1].append(nghd_words[nghd]["topic data"][iterword]["color"])

        top_words_per_nghd[str(key)] = tmpline
        # top_words_per_nghd[str(key)]["topics"] = nghd_words[nghd]["topics"]
        # top_words_per_nghd[str(key)]["color"] = []
        # for iterword in top_words_per_nghd[str(key)]["topics"]:
        #     top_words_per_nghd[str(key)]["color"].append(nghd_words[nghd]["topic data"][iterword]["color"])
    return jsonify(top_words_per_nghd=top_words_per_nghd)

@app.route('/get-senti-per-topic', methods=['GET'])
def get_emojis_senti():
    topic = request.args['topic'].replace("'","")
    print "topic"
    tweets_per_topic = json.load(open('outputs/tweets_per_topic_senti.json'))



    nghd_words = json.load(open('outputs/nghd_words.json'))

    nghds_to_centralPoint = {}
    for line in DictReader(open('nghd_central_point.csv')):
        nghd = line['nghd']
        if nghd in nghd_words:
            if nghd=="Outside Pittsburgh": continue
            if nghd=="Pittsburgh": continue 
            nghds_to_centralPoint[line['nghd']]=[float(line['lat']),float(line['lon'])]
    

    return jsonify(tweets_per_topic=tweets_per_topic[topic],nghds_to_centralPoint=nghds_to_centralPoint)

@app.route('/get-tweets-per-word', methods=['GET'])
def get_tweets_per_word():
    nghd = request.args['nghd'].replace("'","")
    tweet_file_name = 'outputs/tweets_per_nghd_words.json'
    tweets_per_nghd_words = json.load(open(tweet_file_name))
    tweets_per_word = defaultdict(list)
    #bold key word in the tweet
    for word in tweets_per_nghd_words[nghd]:
        for tweet in tweets_per_nghd_words[nghd][word]:
            # tweet = re.sub(word,"<b>" + word + "</b>",tweet,flags=re.IGNORECASE)
            #make links clickable
            for possibleUrl in tweet.split(" "):
                if (possibleUrl.startswith("http")
                         and not "(" in possibleUrl
                         and not ")" in possibleUrl):
                    tweet = re.sub(possibleUrl, '<a href="' + possibleUrl +
                        '" target="_blank">' + possibleUrl + '</a>',tweet)
            tweets_per_word[word].append(tweet)
    return jsonify(tweets_per_word=tweets_per_word)

@app.route('/get-related-tweets-by-word', methods=['GET'])
def get_related_tweets_by_word():
    nghd = request.args['nghd'].replace("'","")
    topic = request.args['topic'].replace("'","")
    senti = request.args['senti'].replace("'","")
    if senti == 'positive':
        sentifactor = 1
    else:
        sentifactor = -1
    keyword = request.args['keyword'].replace("'","")
    tweet_file_name = 'outputs/tweets_per_nghd_words1.json'
    tweets_per_nghd_words = json.load(open(tweet_file_name))
    tweets_per_word = []
    for tweet in tweets_per_nghd_words[nghd][topic]:
        dataArr = tweet.split("&a*a&")
        if (float(dataArr[1]) * sentifactor > 0):
            termArr = dataArr[2].split(",")
            if keyword in termArr:
                rawWord = dataArr[0].split()
                theRawTerm = process.extract(keyword,choices=rawWord, limit=3)
                for j in range(len(theRawTerm)):
                    if theRawTerm[j][1]<91:
                        continue
                    for k in range(len(rawWord)):
                        if theRawTerm[j][0] == rawWord[k]:
                            rawWord[k] = "<b>"+ rawWord[k] +"</b>"
                tweets_per_word.append(format("%s&a*a&%s"%(" ".join(rawWord),dataArr[1])))
    return jsonify(tweets_per_word=tweets_per_word)

if __name__ == '__main__':
    #app.run(host='0.0.0.0', port=5000, debug=False) 
    app.run(host='0.0.0.0',port=5000, debug=False)
    print "running"
 
