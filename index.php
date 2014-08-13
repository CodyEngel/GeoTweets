<?php require_once 'config.php'; ?>
<!DOCTYPE html>
<html style="height: 100%;">
	<head>
		<title>Hudl Interview App</title>
		<script src="https://maps.googleapis.com/maps/api/js?key=<?php echo $googleMapsAPIKey?>&libraries=geometry,places"></script>
		<script src="http://code.jquery.com/jquery-1.9.0.min.js"></script>
		<script src="main.js"></script>
		
		<link href="//maxcdn.bootstrapcdn.com/font-awesome/4.1.0/css/font-awesome.min.css" rel="stylesheet">
		<link href='http://fonts.googleapis.com/css?family=Lato:400,700' rel='stylesheet' type='text/css'>
		<link rel="stylesheet" type="text/css" href="main.css" />
	</head>
	<body style="height: 100%; margin: 0; padding: 0;">
		<div id="search_bar">
			<input id="search_field" type="text" placeholder='Try "Hudl" or "Googleplex"'/>
			<button id="search_button" class="fa fa-search"></button>
		</div>
		<div id="map-canvas"/>
	</body>
</html>