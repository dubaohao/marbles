/* global $, window, document */
/* global toTitleCase, connect_to_server, refreshHomePanel, closeNoticePanel, openNoticePanel, show_tx_step, marbles*/
/* global pendingTxDrawing:true */
/* exported record_company, autoCloseNoticePanel, start_up, block_ui_delay*/
var ws = {};
var bgcolors = ['whitebg', 'blackbg', 'redbg', 'greenbg', 'bluebg', 'purplebg', 'pinkbg', 'orangebg', 'yellowbg'];
var autoCloseNoticePanel = null;
var known_companies = {};
var start_up = true;
var lsKey = 'marbles';
var fromLS = {};
var block_ui_delay = 15000; 								//default, gets set in ws block msg
var auditingMarble = null;

// =================================================================================
// On Load
// =================================================================================
$(document).on('ready', function () {
	fromLS = window.localStorage.getItem(lsKey);
	if (fromLS) fromLS = JSON.parse(fromLS);
	else fromLS = { story_mode: false };					//dsh todo remove this
	console.log('from local storage', fromLS);

	connect_to_server();

	// =================================================================================
	// jQuery UI Events
	// =================================================================================
	$('#createMarbleButton').click(function () {
		console.log('creating marble');
		var obj = {
			type: 'create',
			color: $('.colorSelected').attr('color'),
			size: $('select[name="size"]').val(),
			username: $('select[name="user"]').val(),
			company: $('input[name="company"]').val(),
			owner_id: $('input[name="owner_id"]').val(),
			v: 1
		};
		console.log('creating marble, sending', obj);
		// $('#createPanel').fadeOut();
		$('#createCertificates').fadeOut();
		$('#tint').fadeOut();

		show_tx_step({ state: 'building_proposal' }, function () {
			ws.send(JSON.stringify(obj));

			refreshHomePanel();
			$('.colorValue').html('Color');											//reset
			for (var i in bgcolors) $('.createball').removeClass(bgcolors[i]);		//reset
			$('.createball').css('border', '2px dashed #fff');						//reset
		});

		return false;
	});
//dubaohao-------
// function UpdateMarble(that){
	
	$('#updateMarbleButton').click(function () {
		// var marbleId = $(that).attr('id');
		// MarbleID=marbleId;
		console.log('update marbleInfo');
		var obj = {
			type: 'update_marbleInfo',
			color: $('.colorSelected').attr('color'),
			size: $('select[name="size"]').val(),
			username: $('select[name="user"]').val(),
			company: $('input[name="company"]').val(),
			owner_id: $('input[name="owner_id"]').val(),
			v: 1
		};
		// console.log(marbleId);
		console.log(auditingMarble.id);
		console.log('update marbleInfo, sending',obj);
		update_marbleInfo(auditingMarble.id,obj.color,obj.size,obj.owner_id);
		// $('#createPanel').fadeOut();
		$('#createCertificates').fadeOut();
		$('#tint').fadeOut();

		// show_tx_step({ state: 'building_proposal' }, function () {
		// 	ws.send(JSON.stringify(obj));

			refreshHomePanel();
		// 	$('.colorValue').html('Color');											//reset
		// 	for (var i in bgcolors) $('.createball').removeClass(bgcolors[i]);		//reset
		// 	$('.createball').css('border', '2px dashed #fff');						//reset
		// });

		return false;
		// return true;
	});
// }

	//fix marble owner panel (don't filter/hide it)
	$(document).on('click', '.marblesFix', function () {
		if ($(this).parent().parent().hasClass('marblesFixed')) {
			$(this).parent().parent().removeClass('marblesFixed');
		}
		else {
			$(this).parent().parent().addClass('marblesFixed');
		}
	});

	//marble color picker
	$(document).on('click', '.colorInput', function () {
		$('.colorOptionsWrap').hide();											//hide any others
		$(this).parent().find('.colorOptionsWrap').show();
	});
	$(document).on('click', '.colorOption', function () {
		var color = $(this).attr('color');
		var html = '<span class="fa fa-circle colorSelected ' + color + '" color="' + color + '"></span>';

		$(this).parent().parent().find('.colorValue').html(html);
		$(this).parent().hide();

		for (var i in bgcolors) $('.createball').removeClass(bgcolors[i]);		//remove prev color
		$('.createball').css('border', '0').addClass(color + 'bg');				//set new color
	});

	//username/company search
	$('#searchUsers').keyup(function () {
		var count = 0;
		var input = $(this).val().toLowerCase();
		for (var i in known_companies) {
			known_companies[i].visible = 0;
		}

		//reset - clear search
		if (input === '') {
			$('.marblesWrap').show();
			count = $('#totalUsers').html();
			$('.companyPanel').fadeIn();
			for (i in known_companies) {
				known_companies[i].visible = known_companies[i].count;
				$('.companyPanel[company="' + i + '"]').find('.companyVisible').html(known_companies[i].visible);
				$('.companyPanel[company="' + i + '"]').find('.companyCount').html(known_companies[i].count);
			}
		}
		else {
			var parts = input.split(',');
			console.log('searching on', parts);

			//figure out if the user matches the search
			$('.marblesWrap').each(function () {												//iter on each marble user wrap
				var username = $(this).attr('username');
				var company = $(this).attr('company');
				if (username && company) {
					var full = (username + company).toLowerCase();
					var show = false;

					for (var x in parts) {													//iter on each search term
						if (parts[x].trim() === '') continue;
						if (full.indexOf(parts[x].trim()) >= 0 || $(this).hasClass('marblesFixed')) {
							count++;
							show = true;
							known_companies[company].visible++;								//this user is visible
							break;
						}
					}

					if (show) $(this).show();
					else $(this).hide();
				}
			});

			//show/hide the company panels
			for (i in known_companies) {
				$('.companyPanel[company="' + i + '"]').find('.companyVisible').html(known_companies[i].visible);
				if (known_companies[i].visible === 0) {
					console.log('hiding company', i);
					$('.companyPanel[company="' + i + '"]').fadeOut();
				}
				else {
					$('.companyPanel[company="' + i + '"]').fadeIn();
				}
			}
		}
		//user count
		$('#foundUsers').html(count);
	});

	//login events
	$('#whoAmI').click(function () {													//drop down for login
		if ($('#userSelect').is(':visible')) {
			$('#userSelect').fadeOut();
			$('#carrot').removeClass('fa-angle-up').addClass('fa-angle-down');
		}
		else {
			$('#userSelect').fadeIn();
			$('#carrot').removeClass('fa-angle-down').addClass('fa-angle-up');
		}
	});

	//open create marble panel
	$(document).on('click', '.addMarble', function () {
		$('#tint').fadeIn();
		// $('#createPanel').fadeIn();
		$('#createCertificates').fadeIn();
		var company = $(this).parents('.innerMarbleWrap').parents('.marblesWrap').attr('company');
		var username = $(this).parents('.innerMarbleWrap').parents('.marblesWrap').attr('username');
		var owner_id = $(this).parents('.innerMarbleWrap').parents('.marblesWrap').attr('owner_id');
		$('select[name="user"]').html('<option value="' + username + '">' + toTitleCase(username) + '</option>');
		$('input[name="company"]').val(company);
		$('input[name="owner_id"]').val(owner_id);
	});

	// //dubaohao------open update marble panel
	// $(document).on('click', '.updateMarble', function () {
	// 	// console.log('dubaohao',JSON.stringify($(this)));
	// 	//left click audits marble
	// 	$('#tint').fadeIn();
	// 	$('#createPanel').fadeIn();
	// 	var company = $(this).parents('.innerMarbleWrap').parents('.marblesWrap').attr('company');
	// 	var username = $(this).parents('.innerMarbleWrap').parents('.marblesWrap').attr('username');
	// 	var owner_id = $(this).parents('.innerMarbleWrap').parents('.marblesWrap').attr('owner_id');
	// 	$('select[name="user"]').html('<option value="' + username + '">' + toTitleCase(username) + '</option>');
	// 	$('input[name="company"]').val(company);
	// 	$('input[name="owner_id"]').val(owner_id);
	// });

	//close create marble panel
	$('#tint').click(function () {
		if ($('#startUpPanel').is(':visible')) return;
		if ($('#txStoryPanel').is(':visible')) return;
		//  $('#createPanel, #tint, #settingsPanel').fadeOut();
		$('#createCertificates, #tint, #settingsPanel').fadeOut();
	});

	//notification drawer
	$('#notificationHandle').click(function () {
		if ($('#noticeScrollWrap').is(':visible')) {
			closeNoticePanel();
		}
		else {
			openNoticePanel();
		}
	});

	//hide a notification
	$(document).on('click', '.closeNotification', function () {
		$(this).parents('.notificationWrap').fadeOut();
	});

	//settings panel
	$('#showSettingsPanel').click(function () {
		$('#settingsPanel, #tint').fadeIn();
	});
	$('#closeSettings').click(function () {
		$('#settingsPanel, #tint').fadeOut();
	});

//-dubaohao-------------- 教育
	// $('#createCertificatesButton').click(function () {
	// 	$('#tint').fadeIn();
	// 	$('#createCertificates').fadeIn();
	// 	// $('#createCertificates, #tint').fadeIn();
	// });
	// $('#closeCreateCerts').click(function () {
	// 	$('#createCertificates, #tint').fadeOut();
	// });

	// $('#personInfo').click(function () {
	// 	$('#personInfo, #tint').fadeIn();
	// });
	// $('#personInfo').click(function () {
	// 	$('#personInfo, #tint').fadeOut();
	// });

	// $('#showCertificates').click(function () {
	// 	$('#showCertificates, #tint').fadeIn();
	// });
	// $('#showCertificates').click(function () {
	// 	$('#showCertificates, #tint').fadeOut();
	// });

	// $('#testCertificates').click(function () {
	// 	$('#testCertificates, #tint').fadeIn();
	// });
	// $('#testCertificates').click(function () {
	// 	$('#testCertificates, #tint').fadeOut();
	// });

	// $('#inquireUpInfo').click(function () {
	// 	$('#inquireUpInfo, #tint').fadeIn();
	// });
	// $('#inquireUpInfo').click(function () {
	// 	$('#inquireUpInfo, #tint').fadeOut();
	// });

	// $('#dateTrace').click(function () {
	// 	$('#dateTrace, #tint').fadeIn();
	// });
	// $('#dateTrace').click(function () {
	// 	$('#dateTrace, #tint').fadeOut();
	// });

	// $('#dateTrace').click(function () {
	// 	$('#dateTrace, #tint').fadeIn();
	// });
	// $('#dateTrace').click(function () {
	// 	$('#dateTrace, #tint').fadeOut();
	// });

	// $('#checkConsistency').click(function () {
	// 	$('#dateTrace, #tint').fadeIn();
	// });
	// $('#checkConsistency').click(function () {
	// 	$('#dateTrace, #tint').fadeOut();
	// });


	//story mode selection
	$('#disableStoryMode').click(function () {
		set_story_mode('off');
	});
	$('#enableStoryMode').click(function () {
		set_story_mode('on');
	});

	//close create panel
	$('#closeCreate').click(function () {
		// $('#createPanel, #tint').fadeOut();
		$('#createCertificates, #tint').fadeOut();
	});

	//change size of marble
	$('select[name="size"]').click(function () {
		var size = $(this).val();
		if (size === '16') $('.createball').animate({ 'height': 150, 'width': 150 }, { duration: 200 });
		else $('.createball').animate({ 'height': 250, 'width': 250 }, { duration: 200 });
	});

	//right click opens audit on marble
	$(document).on('contextmenu', '.ball', function () {
		auditMarble(this, true);
		return false;
	});

	//left click audits marble
	$(document).on('click', '.ball', function () {
		//console.log('点击的弹珠属性值为：',$(this));
		auditMarble(this, false);
		auditUpdateMarble(this,false);
		// $(this)='';
		//UpdateMarble(this,false);
		//console.log('核查this',this)
	});

	function auditMarble(that, open) {
		// console.log('点击audits button的this：',$(that));
		var marble_id = $(that).attr('id');
		// console.log('dududududdduud',marble_id);
		$('.auditingMarble').removeClass('auditingMarble');

		if (!auditingMarble || marbles[marble_id].id != auditingMarble.id) {//different marble than before!
			for (var x in pendingTxDrawing) clearTimeout(pendingTxDrawing[x]);
			$('.txHistoryWrap').html('');										//clear
		}

		auditingMarble = marbles[marble_id];
		console.log('\nuser clicked on marble', marble_id);

		if (open || $('#auditContentWrap').is(':visible')) {
			$(that).addClass('auditingMarble');
			$('#auditContentWrap').fadeIn();
			$('#marbleId').html(marble_id);
			$('#ImgPath').html('"/imgs/person.jpg"');//////弹珠换成人物头像照片
			var color = marbles[marble_id].color;
			// console.log('!!!!!!!!',color)
			for (var i in bgcolors) $('.auditMarble').removeClass(bgcolors[i]);	//reset
			$('.auditMarble').addClass(color.toLowerCase() + 'bg');

			$('#rightEverything').addClass('rightEverythingOpened');
			$('#leftEverything').fadeIn();

			var obj2 = {
				type: 'audit',
				marble_id: marble_id
			};
			//console.log('读报好',JSON.stringify(obj2));
			ws.send(JSON.stringify(obj2));
		}
			//console.log('dubaohao 查看当前 that值：',$(that));

	}
//dubaohao------open update marble panel
	function auditUpdateMarble(that,open) {
		// console.log('[点击audits button的this[：',$(that));
		var marble_id = $(that).attr('id');
		marbleID=marble_id;
		// console.log('[marble_id]',marble_id);
		//$(document).on('click', '.updateMarble', function () {
		$('.updateMarble').click(function(){
			 //console.log('dubaohao',$(this).attr('color'));
			//left click audits marble
			$('#tint').fadeIn();
			// $('#createPanel').fadeIn();
			$('#createCertificates').fadeOut();
			//初始化ball的颜色，大小
			var color = marbles[marbleID].color;
			var size = marbles[marbleID].size;
			console.log('id',marbleID,'color:',color,'size:',size);
			//ball的颜色和表单填写
				var html = '<span class="fa fa-circle colorSelected ' + color + '" color="' + color + '"></span>';
				$('.colorValue').html(html);
				for (var i in bgcolors) $('.createball').removeClass(bgcolors[i]);		//remove prev color
					$('.createball').css('border', '0').addClass(color + 'bg');				//set new color
			//ball的大小 添加使ball的大小可以根据文本框里的值，不点击时自动同步
			// $('select[name="size"]').val(size[size.length-1]);
			// $('select[name="size"]').val(marbles[marble_id].size);
			$('select[name="size"]').val(size);
			//change size of marble
			$('select[name="size"]').is(function () {
				var size = $(this).val();
				if (size === '16') $('.createball').animate({ 'height': 150, 'width': 150 }, { duration: 200 });
				else $('.createball').animate({ 'height': 250, 'width': 250 }, { duration: 200 });
			}); 
			var company = $(that).attr('company');
			var username = $(that).attr('username');
			var owner_id = $(that).attr('owner_id');
			//$('select[name="size"]').val(size);
			$('select[name="user"]').html('<option value="' + username + '">' + toTitleCase(username) + '</option>');
			$('input[name="company"]').val(company);
			$('input[name="owner_id"]').val(owner_id);
		});
	}

	$('#auditClose').click(function () {
		$('#auditContentWrap').slideUp(500);
		$('.auditingMarble').removeClass('auditingMarble');												//reset
		for (var x in pendingTxDrawing) clearTimeout(pendingTxDrawing[x]);
		setTimeout(function () {
			$('.txHistoryWrap').html('<div class="auditHint">Click a Marble to Audit Its Transactions</div>');//clear
		}, 750);
		$('#marbleId').html('-');
		auditingMarble = null;

		setTimeout(function () {
			$('#rightEverything').removeClass('rightEverythingOpened');
		}, 500);
		$('#leftEverything').fadeOut();
	});

	$('#auditButton').click(function () {
		$('#auditContentWrap').fadeIn();
		$('#rightEverything').addClass('rightEverythingOpened');
		$('#leftEverything').fadeIn();
	});

	let selectedOwner = null;
	// show dialog to confirm if they want to disable the marble owner
	$(document).on('click', '.disableOwner', function () {
		$('#disableOwnerWrap, #tint').fadeIn();
		selectedOwner = $(this).parents('.marblesWrap');
	});

	// disable the marble owner
	$('#removeOwner').click(function () {
		var obj = {
			type: 'disable_owner',
			owner_id: selectedOwner.attr('owner_id')
		};
		ws.send(JSON.stringify(obj));
		selectedOwner.css('opacity', 0.4);
	});

	$('.closeDisableOwner, #removeOwner').click(function () {
		$('#disableOwnerWrap, #tint').fadeOut();
	});
});

//toggle story mode
function set_story_mode(setting) {
	if (setting === 'on') {
		fromLS.story_mode = true;
		$('#enableStoryMode').prop('disabled', true);
		$('#disableStoryMode').prop('disabled', false);
		$('#storyStatus').addClass('storyOn').html('on');
		window.localStorage.setItem(lsKey, JSON.stringify(fromLS));		//save
	}
	else {
		fromLS.story_mode = false;
		$('#disableStoryMode').prop('disabled', true);
		$('#enableStoryMode').prop('disabled', false);
		$('#storyStatus').removeClass('storyOn').html('off');
		window.localStorage.setItem(lsKey, JSON.stringify(fromLS));		//save
	}
}
