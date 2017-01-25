/*

$.inidb.set(‘table’, ‘key’, ‘value’); // Creates/sets a value in the DB table. Creates the DB table if required.
$.inidb.incr(‘table’, ‘key’, intValue); // Increments a value in the DB table
$.inidb.decr(‘table’, ‘key’, intValue); // Increments a value in the DB table

// The following get, or set the default value into the DB and returns it.
boolean $.getSetIniDbBoolean(table, key, defaultValue)
String $.getSetIniDbString(table, key, defaultValue)
Number $.getSetIniDbNumber(table, key, defaultValue)
Float $.getSetIniDbFloat(table, key, defaultValue)

// The following get a value from the DB casting it to the given type.
String $.inidb.get(‘table’, ‘key’); // Gets a value from the DB
boolean $.getIniDbBoolean(table, key, defaultValue)
String $.getIniDbString(table, key, defaultValue)
Number $.getIniDbNumber(table, key, defaultValue)
Float $.getIniDbFloat(table, key, defaultValue)

$.getUserPoints(sender)
$.getPointsString(number)
$.pointNameSingle;
$.pointNameMultiple;
$.lang.get('betsystem.err.points', $.pointNameMultiple))

$.resolveRank(sender)
$.isOnline($.channelName)
if ($.isMod(username) && $.isSub(username) || $.isAdmin(username) && $.isSub(username)) {
$.getUserGroupName(username)
$.user.isKnown(action.toLowerCase())
$.systemTime(),
$.inidb.exists('grouppoints', $.getUserGroupName(username))
string = betOptions.join(' vs ');

*/

(function() {
	var minimumBet = -1,
		maximumBet = -1,
		status = false,
		closed = false,
		betMessage = $.getSetIniDbBoolean('ftBetSettings', 'betMessage', true),
		pot = 0,
		options = [],
		table = [],
		betTimerStatus = $.getSetIniDbBoolean('ftBetSettings', 'betTimerStatus', false),
		betTimer = $.getSetIniDbNumber('ftBetSettings', 'betTimer', 120);
		timeOut = null;

	/**
	 * @event initReady
	*/
	$.bind('initReady', function() {
		// Continue when module is enabled
		if ($.bot.isModuleEnabled('./games/ft.js')) {

			// Register base command with viewers permission
			$.registerChatCommand('./games/ft.js', 'ft', 7);

			// Register sub commands with permissions
			$.registerChatSubcommand('ft', 'info', 7);
			$.registerChatSubcommand('ft', 'songs', 7);
			$.registerChatSubcommand('ft', 'gamble', 2);
			$.registerChatSubcommand('ft', 'togglemessages', 2);
			$.registerChatSubcommand('ft', 'toggletimer', 2);
			$.registerChatSubcommand('ft', 'settimer', 2);
			$.registerChatSubcommand('ft', 'bet', 7);
		}
	});

	/**
	 * @event command
	*/
	$.bind('command', function(event) {
		var sender = event.getSender().toLowerCase(),
			command = event.getCommand(),
			args = event.getArgs(),
			action = args[0],
			subAction = args[1];

		/**
		 * @commandpath ft - Performs ft operations.
		*/
		if (command.equalsIgnoreCase('ft')) {
			// No sub-command specified
			if (!action) {
				$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.ft'));
				return;
			}

			/**
			 * @commandpath ft info - Show general information.
			*/
			if (action.equalsIgnoreCase('info')) {
				$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.info'));
				return;

			/**
			 * @commandpath ft songs - Gives a link to a spreadsheet.
			*/
			} else if (action.equalsIgnoreCase('songs')) {
				$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.ft.songs'));
				return;

			/**
			 * @commandpath ft help - Shows all commands.
			*/
			} else if (action.equalsIgnoreCase('help')) {
				$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.ft'));
				return;
			
			/**
			 * @commandpath ft togglemessages - Toggles responses ON and OFF.
			*/
			} else if (action.equalsIgnoreCase('togglemessages')) {
				betMessage = !betMessage;
				$.inidb.set('ftBetSettings', 'betMessage', betMessage);

				$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.notification.bets.toggle.' + (betMessage ? 'on' : 'off')));
				return;

			/**
			 * @commandpath ft toggletimer - Toggles automatic closing of bets ON and OFF.
			*/
			} else if (action.equalsIgnoreCase('toggletimer')) {
				betTimerStatus = !betTimerStatus;
				$.inidb.set('ftBetSettings', 'betTimerStatus', betTimerStatus);

				$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.notification.timer.toggle.' + (betTimerStatus ? 'on' : 'off')));
				return;

			/**
			 * @commandpath ft settimer - Sets the time in seconds after a bet will close automatically
			*/
			} else if (action.equalsIgnoreCase('settimer')) {
				if (isNaN(args[1])) {
					$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.params'));
					return;
				} else if (parseInt(args[1]) < 10) {
					$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.timer.minimum'));
					return;
				}


				betTimer = parseInt(args[1]);
				$.inidb.set('ftBetSettings', 'betTimer', betTimer);

				$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.notification.timer.set.' + (betTimerStatus ? 'on' : 'off'), betTimer));
				return;

			/**
			 * @commandpath ft bet [amount] [choice] - Allows viewers to bet.
			*/
			} else if (action.equalsIgnoreCase('bet')) {
				var betAmount, betOption;

				if (!args[1] || !args[2]) {
					$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.ft.bet'));
					return;
				}

				if (args[1].substring(0, 1) == '#') {
					betAmount = args[2];
					betOption = args[1].replace('#', '');
				} else if (args[2].substring(0, 1) == '#') {
					betAmount = args[1];
					betOption = args[2].replace('#', '');
				}
				
				bet(sender, betAmount, betOption);
				return;

			/**
			 * @commandpath ft gamble - Sub-command for setting up bets
			*/
			} else if (action.equalsIgnoreCase('gamble')) {
				// No sub-subcommand specified
				if (!subAction) {
					$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.ft.gamble'));
					return;
				}

				/**
				 * @commandpath ft gamble help - Shows all gamble-subcommands.
				*/
				if (subAction.equalsIgnoreCase('help')) {
					$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.ft.gamble'));
					return;

				/**
				 * @commandpath ft gamble info - Shows current bet and its stats if declared.
				*/
				} else if (subAction.equalsIgnoreCase('info')) {
					printInfo(sender, false);
					return;

				/**
				 * @commandpath ft gamble open [min] [max] [payout1] [payout2] [...] [choice1] [choice2] [...] - Opens a new bet.
				*/
				} else if (subAction.equalsIgnoreCase('open')) {
					openBet(event);
					return;

				/**
				 * @commandpath ft gamble openpreset [name] - Opens a saved bet.
				*/
				} else if (subAction.equalsIgnoreCase('openpreset')) {
					openPreset(sender, args[2]);
					return;

				/**
				 * @commandpath ft gamble savepreset [name] - Saves a running bet.
				*/
				} else if (subAction.equalsIgnoreCase('savepreset')) {
					savePreset(sender, args[2]);
					return;

				/**
				 * @commandpath ft gamble deletepreset [name] - Deletes a saved bet.
				*/
				} else if (subAction.equalsIgnoreCase('deletepreset')) {
					deletePreset(sender, args[2]);
					return;


				/**
				 * @commandpath ft gamble cancel - Cancels a pending bet and returns the points.
				*/
				} else if (subAction.equalsIgnoreCase('cancel')) {
					cancelBet(sender, true);
					return;

				/**
				 * @commandpath ft gamble close - Prevents any further bets by closing.
				*/
				} else if (subAction.equalsIgnoreCase('close')) {
					closeBet(sender);
					return;

				/**
				 * @commandpath ft gamble winner [choice] - Ends the bet, declares the winner(s) and handles the payout.
				*/
				} else if (subAction.equalsIgnoreCase('winner')) {
					evaluateBet(sender, args[2]);
					return;
				}
			}
		}
	});

	/** 
	 * @function bet
	 * @param {Array} sender
	 * @param {Number} amount
	 * @param {Number} option
	 * @returns {boolean}
	 */
	function bet(sender, amount, option) {
		var wager, choice;

		// bet open?
		if (!status) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.bet.404'));
			return;

		// not closed?
		} else if (closed) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.bet.closed'));
			return;		

		// parameters given?
		} else if (!amount || !option) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.ft.bet'));
			return;

		// option numeric?
		} else if (isNaN(option)) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.ft.bet'));
			return;
		}

		// check if the user has a running bet
		for (i in table) {
			if (sender.equalsIgnoreCase(i)) {
				$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.running'));
				return;
			}
        }

        // parse wager
 		if (amount.toUpperCase() == 'ALL') {
    		wager = $.getUserPoints(sender);
		} else if (amount.toUpperCase() == 'MAX') {
    		wager = limit($.getUserPoints(sender), maximumBet);
		} else if (amount.toUpperCase() == 'MIN') {
    		wager = limit($.getUserPoints(sender), minimumBet);
		} else {
			wager = expandPointSuffix(amount);
		}

		choice = parseInt(option) - 1;


		// option pre-caution
		if (choice < 0) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.range'));
			return;

		// option available?
		} else if (!optionAvailable(options, choice)) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.ft.bet'));
			return;

		// check if viewer has enough points
		} else if (parseInt($.getUserPoints(sender.toLowerCase())) < wager) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.points', $.pointNameMultiple));
			return;

		// amount in range?
		} else if (wager < 1 || wager < minimumBet || wager > maximumBet) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.range'));
			return;	
		}

		// bet is fine, decrease viewer's points
		$.inidb.decr('points', sender, wager);
		pot += wager;

		// save the bet
		table[sender] = {
			amount: wager,
			option: choice
		};

		if (betMessage) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.notification.bet.placed', contractPoints(wager), $.pointNameMultiple, options[choice].option));
		}
	};

	/** 
	 * @function optionAvailable
	 * @param {Array} options
	 * @param {*} option
	 * @param {Number} [subIndex]
	 * @returns {boolean}
	 */
	function optionAvailable(choices, choice, subIndex) {
		var result = false;

		if (subIndex > -1) {
			result = choices[choice][subIndex] != null;
		} else {
			result = choices[choice] != null;
		}

		return result;
	};

	/** 
	 * @function openBet
	 * @param {*} event
	 */
	function openBet(event) {
		var sender = event.getSender().toLowerCase(),
			args = event.getArgs(),
			min = args[2],
			max = args[3],
			length = (args.length - 4) / 2,
			payouts = [],
			choices = [],
			output = $.lang.get('pdbetting.notification.bet.opened');

		if (status) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.bet.open'));
			return;
		}

		reset();

		if ((length * 2) % 2 != 0 || args.length < 8) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.ft.gamble.open'));
			return;
		}

		payouts = args.slice(4, 4 + length);
		choices = args.slice(4 + length, 4 + 2 * length);

		for(i in payouts) {
			options[i] = {
				payout: payouts[i],
				option: choices[i].toLowerCase().trim()
			};
		}

		minimumBet = min;
		maximumBet = max;
		status = true;

		if (betTimerStatus) {
			output += ' ' + $.lang.get('pdbetting.notification.bet.timer', betTimer);

			timeOut = setTimeout(function() {
				closeBet('');
			}, betTimer * 1000);
		}

		$.say($.whisperPrefix(sender) + output);
	};
	/** 
	 * @function openPreset
	 * @param {string} sender
	 * @param {string} name
	 */
	function openPreset(sender, name) {
		var payouts = [],
			choices = [],
			output = $.lang.get('pdbetting.notification.bet.opened');

    	// file given?
		if (!name) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.ft.gamble.preset.open'));
			return;
		}

		// file exists?
		if (!$.fileExists('./addons/pdBetSystem/' + name + '.txt')) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.preset.404'));
			return;
		}

		var contents = $.readFile('./addons/pdBetSystem/' + name + '.txt').join('').split(';');

		// sufficient parameters in file?
		if (contents.length != 4) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.preset.corrupt'));
			return;
		}

		payouts = contents[2].split(',');
		choices = contents[3].split(',');

		// Outtake from openBet()
		for(i in payouts) {
			options[i] = {
				payout: payouts[i],
				option: choices[i].toLowerCase().trim()
			};
		}

		minimumBet = contents[0];
		maximumBet = contents[1];
		status = true;

		if (betTimerStatus) {
			output += ' ' + $.lang.get('pdbetting.notification.bet.timer', betTimer);

			timeOut = setTimeout(function() {
				closeBet('');
			}, betTimer * 1000);
		}

		$.say($.whisperPrefix(sender) + output);
	};
	/** 
	 * @function savePreset
	 * @param {string} sender
	 * @param {string} name
	 */
	function savePreset(sender, name) {
		var payouts = '',
			choices = '',
			result = '';

    	// bet open?
		if (!status) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.bet.404'));
			return;
		}

		// file given?
		if (!name) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.ft.gamble.preset.save'));
			return;
		}

		// file already exists
		if ($.fileExists('./addons/pdBetSystem/' + name + '.txt')) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.preset.exists'));
			return;
		}

		for(i in options) {
   			payouts += options[i].payout + ',';
   			choices += options[i].option + ',';
		}

		payouts = payouts.slice(0, -1);
		choices = choices.slice(0, -1);

		result = minimumBet + ';' + maximumBet + ';' + payouts + ';' + choices;
		
		$.mkDir('./addons/pdBetSystem/');
		$.writeToFile(result, './addons/pdBetSystem/' + name + '.txt', false);
	};
	/** 
	 * @function deletePreset
	 * @param {string} sender
	 * @param {string} name
	 */
	function deletePreset(sender, name) {
	    // file given?
		if (!name) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.ft.gamble.preset.delete'));
			return;
		}

		// file exists?
		if (!$.fileExists('./addons/pdBetSystem/' + name + '.txt')) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.preset.404'));
			return;
		}

		$.deleteFile('./addons/pdBetSystem/' + name + '.txt', true);
	};
	/** 
	 * @function closeBet
	 * @param {Array} sender
	 */
	function closeBet(sender) {
		if (!status) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.bet.404'));
			return;
		} else if (closed) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.bet.closed'));
			return;
		}

		closed = true;
		if (timeOut != null) clearTimeout(timeOut);

		$.say((sender != '') ? $.whisperPrefix(sender) : '' + $.lang.get('pdbetting.notification.bet.closed'));
		printInfo(sender, true);
	};
	/** 
	 * @function evaluateBet
	 * @param {Array} sender
	 * @param {Number} winningOption
	 */
	function evaluateBet(sender, winningOption) {
		if (!winningOption) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.ft.gamble.winner'));
		}

		var index = parseInt(winningOption.substring(1)) - 1,
			factor = parseInt(options[index].payout.slice(0, -1)),
			winners = '', message = $.lang.get('pdbetting.notification.bet.winners') + ' ',
			winnerCount = 0;

		for(i in table) {
			if (table[i].option == index) {
				$.inidb.incr('points', i, table[i].amount * factor);

				winners += i + ' (' + contractPoints(table[i].amount * factor) + '), ';
			}

			winnerCount++;
			if (winnerCount > 5) break;
		}

		if (winners.length == 0) {
			message = $.lang.get('pdbetting.notification.bet.nowinners');
		} else {
			winners = winners.slice(0, -2);
			message += winners;
		}

		//$.say($.whisperPrefix(sender) + 'The bet is over. The winning option was "' + options[choice - 1].option + '"');
		$.say($.whisperPrefix(sender) + message);

		reset();
	};
	/** 
	 * @function cancelBet
	 * @param {Array} sender
	 * @param {boolean} refundBets
	 */
	function cancelBet(sender, refundBets) {
		var refunds = 0;

		if (!status) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.bet.404'));
			return;
		}

		status = false;
		clearTimeout(timeOut);

		if (refundBets) {
			for(i in table) {
				refunds++;
				$.inidb.incr('points', i, table[i].amount);
			}
		}

		$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.notification.bet.canceled')); // + (refundBets ? refunds : 'No') + ' refunds.');

		reset();
	};

	/** 
	 * @function printInfo
	 * @param {Array} sender
	 * @param {boolean} verbose
	 */
	function printInfo(sender, verbose) {
		var result = '',
			bets = 0,
			points = 0;

		if (!status) {
			$.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.bet.404'));
			return;
		}

		for(i in options) {
			result += '(' + (parseInt(i) + 1).toString() + ') ' + options[i].option + ', ';

			if (verbose) {
				for(j in table) {
					if (table[j].option == parseInt(i)) {
						bets++;
						points += table[j].amount;
					}
				}


				result = result.slice(0, -2) + $.lang.get('pdbetting.notification.bet.info.suffix', bets, contractPoints(points), $.pointNameMultiple);
			}

			bets = 0;
			points = 0;
		}

		$.say((sender != '') ? $.whisperPrefix(sender) : '' + $.lang.get('pdbetting.notification.bet.info.options', result.slice(0, -2)));
	};

	/**
	 * @function reset
	*/
	function reset() {
		minimumBet = -1;
		maximumBet = -1;
		status = false;
		closed = false;
		betMessage = $.getSetIniDbBoolean('ftBetSettings', 'betMessage', true);
		betWinners = '';
		pot = 0;
		options = [];
		table = [];
		betTimerStatus = $.getSetIniDbBoolean('ftBetSettings', 'betTimerStatus', false);
		betTimer = $.getSetIniDbNumber('ftBetSettings', 'betTimer', 120);
		
		if (timeOut != null) clearTimeout(timeOut);
	};

	/**
	 * @function expandPointSuffix
	 * @param {string} suffixed points
	 * @returns {Number}
	*/
	function expandPointSuffix(pointsString) {
		// m (million), b (billion), t (trillion), Q (Quadrillion)
		var map = [],
			suffix = str.slice(-1),
			temp = -1,
			result = -1;

		map['m'] = 1000000;
		map['b'] = 1000000000;
		map['t'] = 1000000000000;
		map['Q'] = 1000000000000000;

   		if (!isNaN(str.slice(0, -1))) {
      		temp = parseFloat(str.slice(0, -1));

      		if (map[suffix] != undefined) {
         		result = temp * map[suffix];
      		}
   		}

   		return result;
	};

	/**
	 * @function contractPoints
	 * @param {Number} points
	 * @returns {string}
	*/
	function contractPoints(points) {
		// m (million), b (billion), t (trillion), Q (Quadrillion)
		var result = "";
		
		if (points >= 1000000000000000) result = (points / 1000000000000000).toString() + "Q";
		else if (points >= 1000000000000) result = (points / 1000000000000).toString() + "t";
		else if (points >= 1000000000) result = (points / 1000000000).toString() + "b";
		else if (points >= 1000000) result = (points / 1000000).toString() + "m";
		else result = points;

		return result;
	};

	/**
	 * @function limit
	 * @param {Number} value
	 * @param {Number} limit
	 * @returns {Number}
	*/
	function limit(value, limit) {
		if (value < 0) value = 0;
		else if (value > limit) value = limit;

		return value;
	}

	/** Export functions to API */
	$.expandPointSuffix = expandPointSuffix;
	$.contractPoints = contractPoints;
})();
