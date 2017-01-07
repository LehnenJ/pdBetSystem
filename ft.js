/*

TODO:
use lang-strings

*/

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
		betTimerStatus = $.getSetIniDbBoolean('ftBetSettings', 'betTimer', false),
		betTimer = $.getSetIniDbNumber('ftBetSettings', 'betTimerSeconds', 120),
		time = 0;

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
				$.say($.whisperPrefix(sender) + 'Insufficient instructions. Use "!ft help" for help.');
				return;
			}

			/**
			 * @commandpath ft info - Show general information.
			*/
			if (action.equalsIgnoreCase('info')) {
				$.say($.whisperPrefix(sender) + 'A fun plugin to bet on Jay\'s horrible attempts to get good in FT. PokeSlow Use "!ft help" for help.');
				return;

			/**
			 * @commandpath ft songs - Gives a link to a spreadsheet.
			*/
			} else if (action.equalsIgnoreCase('songs')) {
				$.say($.whisperPrefix(sender) + 'Use this list here: https://docs.google.com/spreadsheets/d/13lFZpsnd4rq9gkLvPOBM4Prv1JEzzt-ad4pLVHQwRuo/edit?usp=sharing');
				return;

			/**
			 * @commandpath ft help - Shows all commands.
			*/
			} else if (action.equalsIgnoreCase('help')) {
				$.say($.whisperPrefix(sender) + 'Sub-commands of "!ft": help, info, songs, bet, gamble, togglemessages, toggletimer, settimer.');
				return;
			
			/**
			 * @commandpath ft togglemessages - Toggles responses ON and OFF.
			*/
			} else if (action.equalsIgnoreCase('togglemessages')) {
				betMessage = !betMessage;
				$.inidb.set('ftBetSettings', 'betMessage', betMessage);

				if (betMessage) $.say($.whisperPrefix(sender) + 'bet-messages are now ON!');
				else $.say($.whisperPrefix(sender) + 'bet-messages are now OFF!');

				//$.say($.whisperPrefix(sender) + $.lang.get('betsystem.toggle.' + betMessage.toString()));
				$.log.event(sender + ' toggled the FT bet messages. Now: ' + betMessage);
				return;

			/**
			 * @commandpath ft toggletimer - Toggles automatic closing of bets ON and OFF.
			*/
			} else if (action.equalsIgnoreCase('toggletimer')) {
				betTimerStatus = !betTimerStatus;
				$.inidb.set('ftBetSettings', 'betTimer', betTimerStatus);

				if (betTimerStatus) $.say($.whisperPrefix(sender) + 'automatic closing of bets is now ON!');
				else $.say($.whisperPrefix(sender) + 'automatic closing of bets is now OFF!');

				$.log.event(sender + ' toggled the FT timer settings. Now: ' + betTimerStatus + ' with ' + betTimerSeconds + ' seconds.');
				return;

			/**
			 * @commandpath ft settimer - Sets the time in seconds after a bet will close automatically
			*/
			} else if (action.equalsIgnoreCase('settimer')) {
				if (isNaN(args[1])) {
					$.say($.whisperPrefix(sender) + 'invalid parameters. Only integers.');
					return;
				} else if (parseInt(args[1]) < 10) {
					$.say($.whisperPrefix(sender) + 'minimum is 10 seconds.');
					return;
				}

				betTimerSeconds = parseInt(args[1]);
				$.inidb.set('ftBetSettings', 'betTimer', betTimerSeconds);

				if (betTimerStatus) $.say($.whisperPrefix(sender) + 'bets now close after ' + betTimerSeconds + ' seconds.');
				else $.say($.whisperPrefix(sender) + 'bets would close after ' + betTimerSeconds + ' seconds now.');

				$.log.event(sender + ' toggled the FT timer settings. Now: ' + betTimerStatus + ' with ' + betTimerSeconds + ' seconds.');
				return;

			/**
			 * @commandpath ft bet [amount] [choice] - Allows viewers to bet.
			*/
			} else if (action.equalsIgnoreCase('bet')) {
				if (args[1].substring(0, 1) == '#') {
					bet(sender, args[2], args[1].replace('#', ''));
				} else if (args[2].substring(0, 1) == '#') {
					bet(sender, args[1], args[2].replace('#', ''));
				}
				return;

			/**
			 * @commandpath ft gamble - Sub-command for setting up bets
			*/
			} else if (action.equalsIgnoreCase('gamble')) {
				// No sub-subcommand specified
				if (!subAction) {
					$.say($.whisperPrefix(sender) + 'Insufficient instructions. Use "!ft gamble help" for help.');
					return;
				}

				/**
				 * @commandpath ft gamble help - Shows all gamble-subcommands.
				*/
				if (subAction.equalsIgnoreCase('help')) {
					$.say($.whisperPrefix(sender) + 'sub-commands of "!ft gamble": help, info, open, cancel, close, winner.');
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
			$.say($.whisperPrefix(sender) + 'there is no open bet!');
			return;

		// not closed?
		} else if (closed) {
			$.say($.whisperPrefix(sender) + 'this bet is closed. You may no longer place a bet.');
			return;		

		// parameters given?
		} else if (!amount || !option) {
			$.say($.whisperPrefix(sender) + 'specify an amount and an option. e.g. 2.3b #2 or #1 10m');
			return;

		// option numeric?
		} else if (isNaN(option)) {
			$.say($.whisperPrefix(sender) + 'only numeric integer values for choices!');
			return;
		}

		// check if the user has a running bet
		for (i in table) {
			if (sender.equalsIgnoreCase(i)) {
				$.say($.whisperPrefix(sender) + 'you already have a running bet!');
				return;
			}
		}


		wager = (amount.toUpperCase() == 'ALL') ? $.getUserPoints(sender) : expandPointSuffix(amount);
		choice = parseInt(option) - 1;


		// option pre-caution
		if (choice < 0) {
			$.say($.whisperPrefix(sender) + 'positive values only.');
			return;

		// option available?
		} else if (!optionAvailable(options, choice)) {
			$.say($.whisperPrefix(sender) + 'this option is not available!');
			return;

		// check if viewer has enough points
		} else if (parseInt($.getUserPoints(sender.toLowerCase())) < wager) {
			$.say($.whisperPrefix(sender) + 'you don\'t have that many coins!');
			return;

		// amount in range?
		} else if (wager < 1 || wager < minimumBet || wager > maximumBet) {
			$.say($.whisperPrefix(sender) + 'your bet is not in the specified range. (' + contractPoints(minimumBet) + " - " + contractPoints(maximumBet) + ')');
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
			$.say($.whisperPrefix(sender) + 'your bet has been placed. ' + contractPoints(wager) + ' coins on "' + options[choice].option + '".');
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
	 * @param {Number} min
	 * @param {Number} max
	 * @param {Array} payouts
	 * @param {Array} options
	 */
	function openBet(event) {
		var sender = event.getSender().toLowerCase(),
			args = event.getArgs(),
			min = args[2],
			max = args[3],
			length = (args.length - 4) / 2,
			payouts = [],
			choices = [];

		if (status) {
			$.say($.whisperPrefix(sender) + 'there\'s already an open bet!');
			return;
		}

		reset();

		if ((length * 2) % 2 != 0 || args.length < 8) {
			$.say($.whisperPrefix(sender) + 'missing parameters!');
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

		$.say($.whisperPrefix(sender) + 'opened a new bet!');
	};
	/** 
	 * @function closeBet
	 * @param {Array} sender
	 */
	function closeBet(sender) {
		if (!status) {
			$.say($.whisperPrefix(sender) + 'there is no open bet!');
			return;
		} else if (closed) {
			$.say($.whisperPrefix(sender) + 'this bet is already closed.');
			return;
		}

		closed = true;
		$.say($.whisperPrefix(sender) + 'this bet is now closed.');
		printInfo(sender, true);
	};
	/** 
	 * @function evaluateBet
	 * @param {Array} sender
	 * @param {Number} winningOption
	 */
	function evaluateBet(sender, winningOption) {
		var index = parseInt(winningOption.substring(1)) - 1,
			factor = parseInt(options[index].payout.slice(0, -1)),
			winners = '', message = 'winners: ';


		for(i in table) {
			if (table[i].option == index) {
				$.inidb.incr('points', i, table[i].amount * factor);

				winners += i + ' (' + contractPoints(table[i].amount * factor) + '), ';
			}
		}

		if (winners.length == 0) {
			message = 'no winners.';
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
			$.say($.whisperPrefix(sender) + 'there is no open bet!');
			return;
		}

		status = false;

		if (refundBets) {
			for(i in table) {
				refunds++;
				$.inidb.incr('points', i, table[i].amount);
			}
		}

		$.say($.whisperPrefix(sender) + 'the bet has been canceled. '); // + (refundBets ? refunds : 'No') + ' refunds.');
		$.log.event(sender + ' canceled the bet.');

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
			$.say($.whisperPrefix(sender) + 'there is no open bet!');
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

				result = result.slice(0, -2) + ' - ' + bets + ' bet(s) (' + contractPoints(points) + ' points), ';
			}

			bets = 0;
			points = 0;
		}

		$.say($.whisperPrefix(sender) + 'betting ' + (closed ? 'was' : 'is') + ' open for: ' + result.slice(0, -2) + '.');
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
		betTimerStatus = $.getSetIniDbBoolean('ftBetSettings', 'betTimer', false);
		betTimer = $.getSetIniDbNumber('ftBetSettings', 'betTimerSeconds', 120);
		time = 0;
	};

	/**
	 * @function expandPointSuffix
	 * @param {string} suffixed points
	 * @returns {Number}
	*/
	function expandPointSuffix(pointsString) {
		// m (million), b (billion), t (trillion), Q (Quadrillion)
		var factors = [1000000, 1000000000, 1000000000000, 1000000000000000],
			suffix = pointsString.slice(-1),
			temp = -1,
			result = -1;

		if (!isNaN(pointsString.slice(0, -1))) {
			temp = parseFloat(pointsString.slice(0, -1));

			if (suffix == 'm') result = temp * factors[0];
			else if (suffix == 'b') result = temp * factors[1];
			else if (suffix == 't') result = temp * factors[2];
			else if (suffix == 'Q') result = temp * factors[3];
			else result = parseFloat(pointsString);

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

	/** Export functions to API */
	$.expandPointSuffix = expandPointSuffix;
	$.contractPoints = contractPoints;
})();