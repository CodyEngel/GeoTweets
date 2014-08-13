var map;
var markers = Array();
var infoWindows = Array();
var autocomplete;
var zoomLevel = 15;
var maxZoom = 15;
var refreshUrl = "";

/************************************************
** Google Maps & Location Related Functions
************************************************/

/*
	This gets the map set up and gets the first batch of tweets.
*/
function initialize() {
	var mapOptions = {
		zoom: zoomLevel,
		panControl: false,
		zoomControl: false,
		streetViewControl: false
	};
	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

	autocomplete = new google.maps.places.Autocomplete(document.getElementById('search_field'), { types: ['establishment']});
	  
	// Try HTML5 geolocation
	if(navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			var currentLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

			getTweets(currentLocation.lat(), currentLocation.lng());
		  
			map.setCenter(currentLocation);
		  
		}, function() {
			handleNoGeolocation(true);
		});
	}
	else {
	// Browser doesn't support Geolocation
		handleNoGeolocation(false);
	}
	
	
	// map listeners
	google.maps.event.addListener(map, 'dragend', function() {
		var latitude = map.getBounds().getCenter().lat();
		var longitude = map.getBounds().getCenter().lng();
		getTweets(latitude, longitude);
	});
	google.maps.event.addListener(map, 'zoom_changed', function() {
		var latitude = map.getBounds().getCenter().lat();
		var longitude = map.getBounds().getCenter().lng();
		getTweets(latitude, longitude);
		zoomLevel = map.getZoom();
	});
	google.maps.event.addListener(autocomplete, 'place_changed', function() {
		var place = autocomplete.getPlace();
		if (place.geometry) {
			map.panTo(place.geometry.location);
			getTweets(place.geometry.location.lat(), place.geometry.location.lng());
		}
	});
}

function handleNoGeolocation(errorFlag) {
	if (errorFlag) {
		var content = 'Error: The Geolocation service failed.';
	}
	else {
		var content = 'Error: Your browser doesn\'t support geolocation.';
	}

	var options = {
		map: map,
		position: new google.maps.LatLng(60, 105),
		content: content
	};

	var infowindow = new google.maps.InfoWindow(options);
	map.setCenter(options.position);
}

/*
	This approximates how many miles are viewable on the map. It's not
	entirely accurate, but it seemed to work well enough.
*/
function getViewableRadius() {
	var proximityMiles = 1;
	if(typeof map.getBounds() != 'undefined') {
		var bounds = map.getBounds();

		// Then the points
		var swPoint = bounds.getSouthWest();
		var nePoint = bounds.getNorthEast();

		// Now, each individual coordinate
		var swLat = swPoint.lat();
		var swLng = swPoint.lng();
		var neLat = nePoint.lat();
		var neLng = nePoint.lng();

		var proximityMeter = google.maps.geometry.spherical.computeDistanceBetween(swPoint, nePoint);
		var proximityMiles = (proximityMeter * 0.000621371192) / 3.14;
	}
    return proximityMiles;
}

/*
	This is used when a user doesn't select a place from the Google Maps autocomplete
	dropdown list. It selects the first item from the list and searches for it's address.
	
	This may also be called when the user has selected a place from the Google Maps autocomplete
	dropdown list, but it doesn't seem to affect functionality. Still something that can be fixed
	in the future.
*/
function searchPlaces() {
	var $firstResult	= $('.pac-item:first').children();
	var placeName		= $firstResult[1].textContent;
	var placeAddress	= $firstResult[2].textContent;

	$("#search_field").val(placeName + ", " + placeAddress);

	var geocoder = new google.maps.Geocoder();
	geocoder.geocode({"address":placeAddress }, function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			var lat = results[0].geometry.location.lat(),
				lng = results[0].geometry.location.lng(),
				placeName = results[0].address_components[0].long_name,
				latlng = new google.maps.LatLng(lat, lng);
						
			map.panTo(latlng);
			getTweets(lat, lng);
		}
	});
}

/************************************************
** Twitter Related Function
************************************************/

/*
	This gets tweets for a given latitude, longitude, and radius.
*/
function getTweets(latitude, longitude) {
	clearTweets();
	var miles = getViewableRadius();
	$.getJSON('twitter-proxy.php?url='+encodeURIComponent('search/tweets.json?geocode='+latitude+','+longitude+','+miles+'mi&count=100&result_type=recent'), function(data) {
		refreshUrl = 'twitter-proxy.php?url='+encodeURIComponent('search/tweets.json' + data.search_metadata.refresh_url);
		$.each(data.statuses, function(index, value) {
			addTweetToMap(value);
		});
	});
}

/*
	This works similar to getTweets() except it goes off of the refresh_url which Twitter sends back
	and also doesn't clear old tweets.
*/
function refreshTweets() {
	if(refreshUrl != "") {
		$.getJSON(refreshUrl, function(data) {
			refreshUrl = 'twitter-proxy.php?url='+encodeURIComponent('search/tweets.json' + data.search_metadata.refresh_url);
			console.log(data);
			$.each(data.statuses, function(index, value) {
				console.log(value);
				addTweetToMap(value);
			});
		});
	}
}

/*
	Takes a tweet and displays it on the map. In the future it would be nice to add an animation to the
	marker if it's coming from refreshTweets.
*/
function addTweetToMap(tweet) {
	if(tweet.geo != null) {
		var tweetLatLng = new google.maps.LatLng(tweet.geo.coordinates[0], tweet.geo.coordinates[1]);
		var marker = new google.maps.Marker({
			position: tweetLatLng,
			map: map,
			icon: tweet.user.profile_image_url,
			//animation: google.maps.Animation.DROP
		});
		var infoWindow = new google.maps.InfoWindow({
			content:'<div class="tweet_container">' +
						'<div class="real_name">' + tweet.user.name + '</div>' +  
						'<div class="user_name">@' + tweet.user.screen_name + '</div>' +
						'<div class="time"> - ' + timePassed(Date.parse(tweet.created_at)) + '</div>' +
						'<div class="text">' + tweet.text + '</div>' +
					'</div>'
		});
		google.maps.event.addListener(marker, 'mouseover', function() {
			infoWindow.open(map, marker);
		});
		google.maps.event.addListener(marker, 'mouseout', function() {
			infoWindow.close();
		});
		google.maps.event.addListener(marker, 'click', function() {
			window.open("http://twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id_str);
		});
		
		markers.push(marker);
		infoWindows.push(infoWindow);
	}
}

/*
	Removes all tweets from map, and clears their respective arrays.
*/
function clearTweets() {
	for(var i = 0; i < markers.length; i++) {
		markers[i].setMap(null);
		infoWindows[i].setMap(null);
	}
	markers.length = 0;
	infoWindows.length = 0;
}

/*
	Returns a formatted string displaying how long ago a tweet was sent. This
	was done the same way Twitter shows the time (using a single letter to display
	seconds, minutes, etc.).
	
	23s, 43m, 2w are all valid values to be returned.
*/
function timePassed(timeSent) {
	var currentTime = new Date().getTime() / 1000;
	var timePassed = Math.floor(currentTime - (timeSent / 1000));
	
	if(timePassed < 60) { // seconds
		timePassed = timePassed + "s";
	}
	else if(timePassed >= 60 && timePassed < 3600) { // minutes
		timePassed = Math.floor((timePassed / 60)) + "m";
	}
	else if(timePassed >= 3600 && timePassed < 86400) { // hours
		timePassed = Math.floor((timePassed / 3600)) + "h";
	}
	else if(timePassed >= 86400 && timePassed < 604800) { // days
		timePassed = Math.floor((timePassed / 86400)) + "d";
	}
	else { // weeks
		timePassed = Math.floor((timePassed / 604800)) + "w";
	}
	return timePassed;
}

/************************************************
** Initialize Map & jQuery related code.
************************************************/
google.maps.event.addDomListener(window, 'load', initialize); // Display Google Maps
var interval = window.setInterval(refreshTweets, 60000); // Get new tweets every minute

$(document).ready(function() {
	$(".fa-search").on("click", function() {
		searchPlaces();
	});
	$("#search_field").on("keyup", function(e) {
		if(e.keyCode == 13 && !$('.pac-item-selected').length) {
			searchPlaces();
		}
	});
});