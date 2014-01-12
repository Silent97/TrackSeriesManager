"use strict";

var rdepisode = require('./readdirmedia'),
	path = require('path'),
	nconf = require('nconf'),
	request = require('request');

nconf.file("config-dev.json");

var trackseries = nconf.get("trackseries");

getToken(trackseries, function(token){
	getSeries(token, function(series){
		rdepisode(nconf.get("downloads"), nconf.get("ext"), function (err, files){
			rdepisode(nconf.get("downloads"), ['.srt'], function (err, subtitles){
				var episodes = extractSerie(files, series);
				subtitles = extractSerie(subtitles, series);

				episodes = extractSeasonAndEpisode(episodes);
				subtitles = extractSeasonAndEpisode(subtitles);

				var episodesSub = pairWithSubtitles(episodes,subtitles);
				console.log(files.length + " Media files found.");
				console.log("");

				console.log(episodes.length + " Episodes without subtitles found.");
				episodes.forEach(function(item){
					console.log(item.name);
					console.log(item.serie + " " + item.season + "x" + item.episode);
					console.log("");
				});

				console.log("");

				console.log(episodesSub.length + " Episodes with subtitles found");
				episodesSub.forEach(function(item){
					console.log(item.name);
					console.log(item.serie + " " + item.season + "x" + item.episode);
					console.log("");
				});
			});
		});
	});
});

function getToken(trackseries, callback)
{
	if(trackseries.token){
		callback(trackseries.token);
	}else{
		var options = {
			url: 'http://trackseriesapi.azurewebsites.net/v1/Account/Login',
			method: 'POST',
			form: {
				username: trackseries.username,
				password: trackseries.password,
				grant_type: "password"
			}
		}
		request(options, function(error, response, body){
			var data = JSON.parse(body);
			trackseries.token = data.access_token;
			nconf.set("trackseries", trackseries);
			nconf.save();
			callback(trackseries.token)
		});
	}
}

function getSeries(token, callback){
	var options = {
		url: 'http://trackseriesapi.azurewebsites.net/v1/Follow/Series',
		headers: {
			'Authorization': 'bearer ' + token
		}
	}

    request(options, function(error, response, body){
    	var data = JSON.parse(body);
    	callback(data);
    });
}

function limpiar(text){
	text = text.replace(/ *\([^)]*\) */g, '');
	return text.replace(/[-[\]{}()*+?.,'´\\^$|#\s]/g, '').toLowerCase();
}

function extractSerie(files, series){
	var result = [];
	files.forEach(function(item){
		for(var i=0; i<series.length; i++){
			if(limpiar(item.name).indexOf(limpiar(series[i].name)) != -1){
				item.serieid = series[i].id;
				item.serie = series[i].name;
				result.push(item);
			}
		}
	});

	return result;
}

function extractSeasonAndEpisode(files){
	//Patron S1E01
    var pattern1 = new RegExp(".*?(s|S)(\\d{1,2})(e|E)(\\d{1,2})");
	//Patron 1x01
    var pattern2 = new RegExp(".*?(\\d{1,2})x(\\d{1,2})");
    //Patron 101
    var pattern3 = new RegExp(".*?(\\d{3,4})");

    var result = [];

    files.forEach(function(file){
    	if(pattern1.test(limpiar(file.name))){
	    	var match = limpiar(file.name).match(pattern1);
	    	file.season = parseInt(match[2]);
	    	file.episode = parseInt(match[4]);
	    	result.push(file);
	    }else if(pattern2.test(limpiar(file.name))){
	    	var match = limpiar(file.name).match(pattern2);
	    	file.season = parseInt(match[1]);
	    	file.episode = parseInt(match[2]);
	    	result.push(file);
	    }else if(pattern3.test(limpiar(file.name))){
	    	var match = limpiar(file.name).match(pattern3);
	    	var resultado = parseInt(match[1]);
	    	if(resultado.length == 3){
	    		file.season = resultado[0];
	    		file.episode = parseInt(resultado[1] + resultado[2]);
	    	}else{
	    		file.season = parseInt(resultado[0] + resultado[1]);
	    		file.episode = parseInt(resultado[2] + resultado[3]);
	    	}
	    	result.push(file);
	    }
    });

    return result;
}

function pairWithSubtitles(episodes, subtitles){
	var result = [];
	var removeSub = [];
	episodes.forEach(function(episode){
		for(var i=0; i<subtitles.length; i++){
			if(episode.serie === subtitles[i].serie && episode.episode === subtitles[i].episode && episode.season === subtitles[i].season){
				episode.subtitle = subtitles[i];
				result.push(episode);
				removeSub.push(subtitles[i]);
			}
		}
	});

	result.forEach(function(item){
		episodes.splice(episodes.indexOf(item),1);
	});
	removeSub.forEach(function(item){
		subtitles.splice(subtitles.indexOf(item),1);
	});
	return result;
}