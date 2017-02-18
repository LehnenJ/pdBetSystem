(function() {
    var minimumBet = -1,
        maximumBet = -1,
        status = false,
        closed = false,
        betMessage = $.getSetIniDbBoolean('pdBetSettings', 'betMessage', true),
        pot = 0,
        options = [],
        table = [],
        betTimerStatus = $.getSetIniDbBoolean('pdBetSettings', 'betTimerStatus', false),
        betTimer = $.getSetIniDbNumber('pdBetSettings', 'betTimer', 120),
        timeOut = null;

    /**
     * @event initReady
    */
    $.bind('initReady', function() {
        // Abort when dependency modules are disabled
        if (!$.bot.isModuleEnabled('./systems/pointSystem.js')) return;

        // Continue when module is enabled
        if ($.bot.isModuleEnabled('./games/pd.js')) {

            // Register base command with viewers permission
            $.registerChatCommand('./games/pd.js', 'pd', 7);

            // Register sub commands with permissions
            $.registerChatSubcommand('pd', 'info', 7);
            $.registerChatSubcommand('pd', 'songs', 7);
            $.registerChatSubcommand('pd', 'gamble', 2);
            $.registerChatSubcommand('pd', 'togglemessages', 2);
            $.registerChatSubcommand('pd', 'toggletimer', 2);
            $.registerChatSubcommand('pd', 'settimer', 2);
            $.registerChatSubcommand('pd', 'bet', 7);
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
         * @commandpath pd - Performs pd operations.
        */
        if (command.equalsIgnoreCase('pd')) {
            // No sub-command specified
            if (!action) {
                $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.pd'));
                return;
            }

            /**
             * @commandpath pd info - Show general information.
            */
            if (action.equalsIgnoreCase('info')) {
                $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.info'));
                return;

            /**
             * @commandpath pd songs - Gives a link to a spreadsheet.
            */
            } else if (action.equalsIgnoreCase('songs')) {
                $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.pd.songs'));
                return;

            /**
             * @commandpath pd help - Shows all commands.
            */
            } else if (action.equalsIgnoreCase('help')) {
                $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.pd'));
                return;
            
            /**
             * @commandpath pd togglemessages - Toggles responses ON and OFF.
            */
            } else if (action.equalsIgnoreCase('togglemessages')) {
                betMessage = !betMessage;
                $.inidb.set('pdBetSettings', 'betMessage', betMessage);

                $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.notification.bets.toggle.' + (betMessage ? 'on' : 'off')));
                return;

            /**
             * @commandpath pd toggletimer - Toggles automatic closing of bets ON and OFF.
            */
            } else if (action.equalsIgnoreCase('toggletimer')) {
                betTimerStatus = !betTimerStatus;
                $.inidb.set('pdBetSettings', 'betTimerStatus', betTimerStatus);

                $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.notification.timer.toggle.' + (betTimerStatus ? 'on' : 'off')));
                return;

            /**
             * @commandpath pd settimer - Sets the time in seconds after a bet will close automatically
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
                $.inidb.set('pdBetSettings', 'betTimer', betTimer);

                $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.notification.timer.set.' + (betTimerStatus ? 'on' : 'off'), betTimer));
                return;

            /**
             * @commandpath pd bet [amount] [choice] - Allows viewers to bet.
            */
            } else if (action.equalsIgnoreCase('bet')) {
                var betAmount, betOption;

                if (!args[1] || !args[2]) {
                    $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.pd.bet'));
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
             * @commandpath pd gamble - Sub-command for setting up bets
            */
            } else if (action.equalsIgnoreCase('gamble')) {
                // No sub-subcommand specified
                if (!subAction) {
                    $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.pd.gamble'));
                    return;
                }

                /**
                 * @commandpath pd gamble help - Shows all gamble-subcommands.
                */
                if (subAction.equalsIgnoreCase('help')) {
                    $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.pd.gamble'));
                    return;

                /**
                 * @commandpath pd gamble info - Shows current bet and its stats if declared.
                */
                } else if (subAction.equalsIgnoreCase('info')) {
                    printInfo(sender, false);
                    return;

                /**
                 * @commandpath pd gamble open [min] [max] [payout1] [payout2] [...] [choice1] [choice2] [...] - Opens a new bet.
                */
                } else if (subAction.equalsIgnoreCase('open')) {
                    openBet(event);
                    return;

                /**
                 * @commandpath pd gamble openpreset [name] - Opens a saved bet.
                */
                } else if (subAction.equalsIgnoreCase('openpreset')) {
                    openPreset(sender, args[2]);
                    return;

                /**
                 * @commandpath pd gamble savepreset [name] - Saves a running bet.
                */
                } else if (subAction.equalsIgnoreCase('savepreset')) {
                    savePreset(sender, args[2]);
                    return;

                /**
                 * @commandpath pd gamble deletepreset [name] - Deletes a saved bet.
                */
                } else if (subAction.equalsIgnoreCase('deletepreset')) {
                    deletePreset(sender, args[2]);
                    return;

                /**
                 * @commandpath pd gamble listpresets - Lists all saved bets.
                */
                } else if (subAction.equalsIgnoreCase('listpresets')) {
                    listPresets(sender);
                    return;

                /**
                 * @commandpath pd gamble cancel - Cancels a pending bet and returns the points.
                */
                } else if (subAction.equalsIgnoreCase('cancel')) {
                    cancelBet(sender, true);
                    return;

                /**
                 * @commandpath pd gamble close - Prevents any further bets by closing.
                */
                } else if (subAction.equalsIgnoreCase('close')) {
                    closeBet(sender);
                    return;

                /**
                 * @commandpath pd gamble winner [choice] - Ends the bet, declares the winner(s) and handles the payout.
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
            $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.pd.bet'));
            return;

        // option numeric?
        } else if (isNaN(option)) {
            $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.pd.bet'));
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
            $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.pd.bet'));
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
            $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.pd.gamble.open'));
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

        $.say(((sender != '') ? $.whisperPrefix(sender) : '') + $.lang.get('pdbetting.notification.bet.closed'));
        printInfo(sender, true);
    };
    /** 
     * @function evaluateBet
     * @param {Array} sender
     * @param {Number} winningOption
    */
    function evaluateBet(sender, winningOption) {
        if (!winningOption) {
            $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.pd.gamble.winner'));
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
     * @function getPresets
     * @returns {Array}
    */
    function getPresets() {
        var presets = [],
            contents = [],
            splitted = [];

        // preset file exists?
        if (!$.fileExists('./addons/pdBetSystem/presets.txt')) {
            $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.notification.presets.404'));
            $.touchFile('./addons/pdBetSystem/presets.txt');
            return;
        }

        contents = $.readFile('./addons/pdBetSystem/presets.txt');

        // parse presets
        for (i in contents) {
            splitted = contents[i].split(';');

            if (splitted.length == 5) {
                presets.push({
                    name: splitted[0].toLowerCase().trim(),
                    min: splitted[1],
                    max: splitted[2],
                    payouts: splitted[3].split(','),
                    options: splitted[4].split(',')
                });
            } else {
                $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.preset.corrupt', i + 1));
            }
        }

        return presets;
    };

    /** 
     * @function presetExists
     * @param {string} name
     * @returns {boolean}
    */
    function presetExists(name) {
        var presets = getPresets(),
            index = -1;

        for(i in presets) {
            if (presets[i].name == name.toLowerCase().trim()) {
                index = i;
                break;
            }
        }

        return index;
    };    

    /** 
     * @function openPreset
     * @param {string} sender
     * @param {string} name
    */
    function openPreset(sender, name) {
        var presets = [],
            preset,
            output = $.lang.get('pdbetting.notification.bet.opened');

        // name given?
        if (!name) {
            $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.pd.gamble.preset.open'));
            return;
        }


        presets = getPresets();


        if (presetExists(name) === -1) {
            $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.preset.404'));
            return;
        }


        reset();

        if (preset.payouts.length != preset.options.length) {
            $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.preset.corrupt'));
            return;
        }

        // Outtake from openBet()
        for(i in preset.payouts) {
            options[i] = {
                payout: preset.payouts[i],
                option: preset.options[i]
            };
        }

        minimumBet = preset.min;
        maximumBet = preset.max;
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
        var presets = [],
            payouts = '',
            choices = '',
            result = '';

        // bet open?
        if (!status) {
            $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.bet.404'));
            return;
        }

        // name given?
        if (!name) {
            $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.pd.gamble.preset.save'));
            return;
        }


        presets = getPresets();


        if (presetExists(name) !== -1) {
            $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.preset.exists'));
            return;
        }

        for(i in options) {
            payouts += options[i].payout + ',';
            choices += options[i].option + ',';
        }

        payouts = payouts.slice(0, -1);
        choices = choices.slice(0, -1);

        result = name + ';' + minimumBet + ';' + maximumBet + ';' + payouts + ';' + choices;
        
        $.mkDir('./addons/pdBetSystem/');
        $.writeToFile($.readFile('./addons/pdBetSystem/presets.txt').join('\n') + '\n' + result, './addons/pdBetSystem/presets.txt', false);
        $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.notification.presets.save', name));
    };
    /** 
     * @function deletePreset
     * @param {string} sender
     * @param {string} name
    */
    function deletePreset(sender, name) {
        var presets = [],
            contents = [],
            index = -1;

        // file given?
        if (!name) {
            $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.usage.pd.gamble.preset.delete'));
            return;
        }

        presets = getPresets();
        index = presetExists(name);

        if (index == -1) {
            $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.err.preset.404'));
            return;
        }

        // delete entry from array
        presets.splice(index, 1);

        // map to a objects to a string array
        contents = presets.map(function(p) {
            return [
                p.name,
                p.min,
                p.max,
                p.payouts.join(','),
                p.options.join(',')
            ].join(';');
        });

        // write to file
        $.writeToFile(contents.join('\n'), './addons/pdBetSystem/presets.txt', false);
        $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.notification.presets.delete', name));
    };
    /** 
     * @function listPresets
    */
    function listPresets(sender) {
        var presets = getPresets(),
            result = '';

        // Make a string of all preset names, comma separated
        result = presets.map(function(p) { return p.name; }).join(', ');
        result = result.slice(0, -2);

        $.say($.whisperPrefix(sender) + $.lang.get('pdbetting.notification.presets.list', result));
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

        $.say(((sender != '') ? $.whisperPrefix(sender) : '') + $.lang.get('pdbetting.notification.bet.info.options', result.slice(0, -2)));
    };

    /**
     * @function reset
    */
    function reset() {
        minimumBet = -1;
        maximumBet = -1;
        status = false;
        closed = false;
        betMessage = $.getSetIniDbBoolean('pdBetSettings', 'betMessage', true);
        betWinners = '';
        pot = 0;
        options = [];
        table = [];
        betTimerStatus = $.getSetIniDbBoolean('pdBetSettings', 'betTimerStatus', false);
        betTimer = $.getSetIniDbNumber('pdBetSettings', 'betTimer', 120);
        
        if (timeOut != null) clearTimeout(timeOut);
    };

    /**
     * @function expandPointSuffix
     * @param {string} suffixed points
     * @returns {Number}
    */
    function expandPointSuffix(pointsString) {
        // m (million), b (billion), t (trillion), Q (Quadrillion)
        var map = {},
            suffix = pointsString.slice(-1),
            temp = -1,
            result = -1;

        map['m'] = 1000000;
        map['b'] = 1000000000;
        map['t'] = 1000000000000;
        map['Q'] = 1000000000000000;
        
        if (map[suffix] != undefined) {
            if (!isNaN(pointsString.slice(0, -1))) {
                temp = parseFloat(pointsString.slice(0, -1));

                result = temp * map[suffix];
            }
        } else if (!isNaN(pointsString)) {
            result = parseFloat(pointsString);
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
    $.limit = limit;
})();