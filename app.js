var app = {
	connect: function() {
		if(FB.getUserID())
			return app.play_or_like();

		FB.login(function(){
			app.play_or_like();

			/*$.post('/ajax/register', {
				signed_request: FB.getAuthResponse().signedRequest
			})*/
		}, {scope: 'user_photos,publish_actions'});
	},

	play_or_like: function() {
		if( ! FB.getUserID() ) {
			$('#play').show();
			$('#like').hide();
		} else {
			$('#play').fadeOut()
			$('#loading').show();
			return this._play();

			$('#like').hide(); // jic

			var page_id = $('#like .fb-like').data('page-id');
			FB.api('/me/likes/'+page_id, function(r){

				$('#loading').hide();

				if(r.data && r.data[0] && r.data[0].id == page_id)
					// fan
					app._play();
				else {
					// new-fan :-)
					$('#like').show();
					// $('.x-fb-like', '#like').removeClass('x-fb-like').addClass('fb-like')
					FB.XFBML.parse($('#like')[0], function(){
						setTimeout(function(){$('#like em').fadeIn('slow')}, 300);
					})

					FB.Event.subscribe('edge.create', function(){
						$('#like').fadeOut();
						app._play();
					})
				}
			})
		}
	},

	_play: function() {
		var photo=null;

		if(parseInt(Math.random()*10%2)) {
			FB.api('/me/photos', function(photos){
				photo=photos.data[parseInt( (Math.random()*10000)%photos.data.length)].source;
				draw_photo(photo);
			})
		} else {
			albid=null
			FB.api('/me/albums',function(res){
				albid=res.data[parseInt( (Math.random()*10000)%res.data.length)].id;
				FB.api('/'+albid+'/photos',function(resp){
					photo = resp.data[parseInt( (Math.random()*10000)%resp.data.length)].source;
					draw_photo(photo);
				});
			});
		}

		var draw_photo=function(photo){
			$("#puzzleImage")[0].src = photo; $("#puzzleImage")[0].width = 740;
			$("#puzzle").css("height",$("#puzzleImage").css("height"));
			$('#overlay').fadeIn();
			$('#puzzle').fadeIn();
			app._makePuzzle();
		}

	},

	_pieces: [
		[0, 0, 180, 100],
		[180, 0, 180, 100],
		[360, 0, 180, 100],
		[540, 0, 180, 100],

		[0, 100, 180, 100],
		[180, 100, 180, 100],
		[360, 100, 180, 100],
		[540, 100, 180, 100],

		[0, 200, 180, 100],
		[180, 200, 180, 100],
		[360, 200, 180, 100],
		[540, 200, 180, 100],

		[0, 300, 180, 100],
		[180, 300, 180, 100],
		[360, 300, 180, 100],
		[540, 300, 180, 100]
	],

	_arcs: [
		// 
	],

	_currentImage: 0,

	_makePuzzle: function() {
		var puzzle = $('#puzzleImage')[0];
		var image  = new Image(250, 250);

		image.onload = function() {
			var p = app._pieces[app._currentImage];

			if(!p) return app._puzzleReady();

			var c = document.createElement('canvas');
			var ctx = c.getContext('2d');

			var x = p[0], y = p[1], w = p[2], h = p[3];
			c.width = w-1;
			c.height = h-1;

			/*
			ctx.beginPath();

			ctx.moveTo(x, y);

			// Draw lines, first
			ctx.lineTo(x+w, y);
			ctx.lineTo(x+w, y+h);
			ctx.lineTo(x, y+h);

			ctx.closePath();

			// Clip to the current path
			ctx.clip();
			//*/

			// And then arcs
			var arc = app._arcs[app._currentImage];
			if(arc) {
				// 
			}

			ctx.drawImage(image, -x, 200-y-(puzzle.height/2), puzzle.width, puzzle.height);

			// $(c).css({'border': '1px solid ' + (['red', 'green', 'blue', 'yellow', 'cyan'][app._currentImage % 5])})
			var pos = { left: x, top: y };

			$(c).css(pos).data('pos', pos).attr('id', 'c'+app._currentImage)
			$('#puzzle').append(c);

			app._currentImage++;
			app._makePuzzle();
		}

		image.src = puzzle.src;
	},

	_puzzleReady: function() {
		$('#puzzle img').fadeOut(function(){
			$('#puzzle canvas').fadeIn();
			setTimeout(app._movePuzzles, 2000)
		});
	},

	_movePuzzles: function() {

		$('#puzzle canvas')
		.each(function(){
			$(this).animate({
				top: 100+Math.random()*300,
				left: ((Math.random()*25) % 25)*15
			})
		})
		.draggable({
			containment: 'parent',
			stop: function() {

				var offset = $(this).position();
				var pos    = $(this).data('pos');

				var top = Math.abs(offset.top - pos.top);
				var left = Math.abs(offset.left - pos.left);

				if(top < 15 && left < 15) {
					$(this)
						.css({ top: pos.top, left: pos.left })
						.animate({ opacity: 0.6 }).animate({ opacity: 1 }, function(){
							app._checkSolved();
						})
						.draggable('option', 'disabled', true)
						.css('zIndex', 10);
				}
				else
				{
					$(this).css('zIndex', Math.max(1, $(this).css('zIndex') || 0));
				}
			}
		});
		app._a = new Date().valueOf();
	},

	_checkSolved: function() {
		for(var i = 0; i < app._pieces.length; i++) {
			var p = app._pieces[i];
			var offset = $('#c'+i).position()

			if(Math.abs(parseInt(offset.left) - p[0]) > 5 ||
				Math.abs(parseInt(offset.top) - p[1]) > 5)
					return;
		}

		app.time_taken = ((new Date().valueOf()) - app._a) || 0;

		/*
		$.post('/billa2_puzzle/solved/', {
			signed_request: FB.getAuthResponse().signedRequest,
			time_taken: app.time_taken
		})
		*/

		app.time_taken /= 100;
		app.time_taken = parseInt(app.time_taken) / 10;

		// $('#puzzle').html($('#success').html())

		$('#puzzle').addClass('solved');
		$('img', '#puzzle').hide();
		$('canvas', '#puzzle').fadeOut(function(){
			app.winScoreAdd(); $('table').hide()
			$('#success').fadeIn();
		});

	},

	postToFeed: function() {
		FB.ui({
			method: 'feed',
			link: 'http://apps.facebook.com/jigsawfriends',
			picture: 'http://i.imgur.com/5Dez2.jpg',
			name: 'Solved puzzle in '+(app.time_taken)+' seconds',
			caption: 'Solve many more of your photo puzzles with JigsawFriends',
			description: ' '
		})
	},

	inviteFriends: function() {
		FB.ui({
			method: 'apprequests',
			message: 'Billa 2 for 2: Solved in '+(app.time_taken)+' seconds. Play and get a chance to win a couple of tickets'
		})
	},

	overallRanking: function() {
		$('#overlay').fadeIn();
	},

	friendsRanking: function() {
		$('#overlay').fadeIn();
	},

	showScores: function(){
		FB.api('/me/scores',function(res){
			if(!res || res.error || !res.data[0])
				sco='0';
			else
				sco=res.data[0].score;
			level=1;
			lvl=[50,120,300,500,800,1300,2000,5000,10000]
			for(i=0;i<lvl.length;i++)
				if(sco<lvl[i]){
					level=i;
					break;
				}
			$('#score').html('Your score: '+sco+'<br /><br /><br />&nbsp &nbsp &nbsp &nbsp Level: '+level);
		});
	},

	winScoreAdd: function(){
		FB.api('/me/scores',function(res){
			if(!res || res.error || !res.data[0])
				sco='0';
			else
				sco=res.data[0].score;
			sco+=10;
		FB.api('/me/scores?score='+sco,'post',function(){console.log(arguments)});
		});
	}
	

}

$(function(){
	$('a[class-hover]').hover(function(){
		$(this).addClass($(this).attr('class-hover'))
	}, function(){
		$(this).removeClass($(this).attr('class-hover'))
	})

	$('#overlay').css('opacity', 0.7);

	// $('.ui-button').mousedown(function(){ $(this).addClass(   'ui-mouse-down') })
	// $('.ui-button').mouseup(  function(){ $(this).removeClass('ui-mouse-down') })

	if (!app.fb_names) app.fb_names = {}
	$('.fb_name').each(function(){
		var id = $(this).data('id')
		if(!id || id=='None') return;
		if(app.fb_names[id]) return $(this).text(app.fb_names[id].name);

		var fb_name = $(this)
		$.getJSON('//graph.facebook.com/'+id, function(data){
			app.fb_names[id] = data
			fb_name.text(data.name)
		})
	})

})

window.fbAsyncInit = function() {
	FB.init({
		appId      : window.appId || 356667931084420, // App ID
		channelUrl : '//'+location.host+'/channel.html', // Channel File
		status     : true, // check login status
		cookie     : true, // enable cookies to allow the server to access the session
		xfbml      : true  // parse XFBML
	});

	// app.play_or_like();

	FB.getLoginStatus(function(){
		// if(FB.getUserID()) $('#friends_ranking').show()
		if(FB.getUserID()) app.showScores()
		
	});
}


var _gaq = _gaq || [
	['_setAccount', 'UA-33514875-1'],
	['_setDomainName', 'netrcs.appspot.com'],
	['_trackPageview']
];