const getBoardID = () => { return window.location.href.split('/')[4]; }
const toTitleCase = (str) => {
	return str.replace(/\w\S*/g, (txt) => {
		return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	});
};

const stylesheet = {
	"add": (type, id, href) => {
		if (!document.getElementById(id)) {
			let sheet = document.createElement(type);
			if (type == 'link') {
				sheet.rel = 'stylesheet';
				sheet.type = 'text/css';
				sheet.href = chrome.runtime.getURL('/assets/css/'+href+'.css');
			}
			else if (type == 'style') {
				sheet.innerText = href;
			}
			sheet.id = id;
			document.body.appendChild(sheet);
		}
	},
	"remove": (id) => {
		if (document.getElementById(id)) {
			let sheet = document.getElementById(id);
			sheet.parentNode.removeChild(sheet);
		}
	},
	"update": (type, id, href) => {
		stylesheet.remove(id);
		stylesheet.add(type, id, href);
	}
}
const el = {
    "create": (type, options) => {
        let e = document.createElement(type);
        if (options.text) { e.innerText = options.text }
        if (options.html) { e.innerHTML = options.html }
        for (var attr in options.attributes)    { e.setAttribute(attr, options.attributes[attr]); }
        for (var listener in options.listeners) { e.addEventListener(listener, options.listeners[listener]); }
        for (var child in options.children)     { e.append(options.children[child]); }

        let s = '';
        for (var style in options.style) { s += style + ': ' + options.style[style] + '; ' };
        e.setAttribute('style', s);

        return e;
    },
    "append": (appender, appendee) => {
		if (appender && appendee) { appender.append(appendee); }
    },
    "get": (query) => {
        let e = document.querySelectorAll(query);
        return e.length > 1 ? e : e[0];
    },
    "remove": (query) => {
        let e = document.querySelectorAll(query);
		if (e.length > 0) {
			if (e.length > 1) { e.forEach((f) => { f.parentNode.removeChild(f); }); }
			else { e[0].parentNode.removeChild(e[0]); }
		}
    },
    "find": (e, query) => {
        // Element.matches() polyfill
    	if (!Element.prototype.matches) {
    		Element.prototype.matches =
			Element.prototype.matchesSelector ||
			Element.prototype.mozMatchesSelector ||
			Element.prototype.msMatchesSelector ||
			Element.prototype.oMatchesSelector ||
			Element.prototype.webkitMatchesSelector ||
			function(s) {
				var matches = (this.document || this.ownerDocument).querySelectorAll(s),
					i = matches.length;
				while (--i >= 0 && matches.item(i) !== this) {}
				return i > -1;
			};
    	}

    	// Get closest match
    	for ( ; e && e !== document; e = e.parentNode ) { if ( e.matches( query ) ) return e; }
    	return null;
    }
}
const popover = {
	"show": (top, left, title, content) => {
		popover.hide();

		let popOver = el.get('.pop-over');
		popOver.style.top = top + 42 + 'px';
		if ( (left + 306) > document.body.clientWidth ) { left = left - 306 + 22; }
		popOver.style.left = left+'px';
		popOver.classList.add('is-shown');


		el.append(
			popOver,
			// Popover Back
			el.create('div', {
				attributes: { class: 'no-back' },
				children: [
					// Popover Header
					el.create('div', {
						attributes: { class: 'pop-over-header js-pop-over-header' },
						children: [
							// Header Name
							el.create('span', {
								text: title,
								attributes: { class: 'pop-over-header-title' }
							}),

							// Close Btn
							el.create('a', {
								attributes: { href: '#', class: 'pop-over-header-close-btn icon-sm icon-close' },
								listeners: { click: (event) => { popover.hide(); } }
							})
						]
					}),

					// Content
					el.create('div', {
						children: [
							el.create('div', {
								attributes: { class: 'pop-over-content js-pop-over-content u-fancy-scrollbar js-tab-parent' },
								children: [
									el.create('div', {
										children: [
											el.create('div', {
												children: content
											})
										]
									})
								]
							})
						]
					})
				]
			})
		)
	},
	"hide": () => {
		el.remove('.pop-over .no-back');
		el.get('.pop-over').classList.remove('is-shown');
	}
}

// Card Counting Functions
const saveCardLimit = () => {
	let lists = document.querySelectorAll('.list');

	settings.get(options => {
		let s = {};
		s.cardCounter = options.cardCounter;

		if (lists) {
			let listLimits = [];
			lists.forEach(list => {
				let listLimit = list.querySelector('.eft-card-limit').innerText.substring(1);
				listLimits.push(listLimit);
			});

			s.cardCounter.subsettings.limits = s.cardCounter.subsettings.limits ? s.cardCounter.subsettings.limits : {};
			s.cardCounter.subsettings.limits[getBoardID()] = listLimits;

			settings.save(s);
		}
	});


}
const setInitLimits = () => {
	settings.get(options => {
		let i = 0;
		if (options.cardCounter.subsettings.limits && options.cardCounter.subsettings.limits[getBoardID()]) {
			options.cardCounter.subsettings.limits[getBoardID()].forEach(limit => {
				let list = document.querySelectorAll('.list')[i];

				if (list.querySelector('.eft-card-limit').innerText == '/0') {
					list.querySelector('.eft-card-limit').innerText = '/' + limit;
					if (limit != 0) { list.querySelector('.eft-card-limit').classList.remove('eft-card-limit-off'); }
					else { list.querySelector('.eft-card-limit').classList.add('eft-card-limit-off'); }
				}

				i++;
			});
		}
	});
}
const percentage = (a,b) => { return (a/b)*100; }
const updateCounterColor = () => {
	settings.get(options => {
		if (options.cardCounter.subsettings.warningColors ||
			options.cardCounter.subsettings.harshLimits) {
			let i = 0;
			let lists = document.querySelectorAll('.list');
			if (lists) {
				lists.forEach(list => {
					let counter = list.querySelector('.eft-card-count'),
						count   = list.querySelector('.eft-card-count-number').innerText,
						limit   = list.querySelector('.eft-card-limit').innerText.substring(1);

					// Warning Colors
					if (limit != 0 && options.cardCounter.subsettings.warningColors) {
						if      (percentage(count, limit) > 79) { counter.style.color = '#f44336'; }
						else if (percentage(count, limit) > 59) { counter.style.color = '#ffc107'; }
						else { counter.style.color = 'rgb(128,128,128)'; }
					} else   { counter.style.color = 'rgb(128,128,128)'; }

					// Harsh Limit
					if (limit != 0 && options.cardCounter.subsettings.harshLimits) {
						if (percentage(count, limit) > 99) {
							list.querySelector('.js-open-card-composer').style.pointerEvents = 'none';
							list.querySelector('.js-open-card-composer').style.opacity = '0.5';
							list.classList.add('list-eft-limited');
						} else {
							list.querySelector('.js-open-card-composer').style.pointerEvents = 'auto';
							list.querySelector('.js-open-card-composer').style.opacity = '1';
							list.classList.remove('list-eft-limited');
						}
					} else {
						list.querySelector('.js-open-card-composer').style.pointerEvents = 'auto';
						list.querySelector('.js-open-card-composer').style.opacity = '1';
						list.classList.remove('list-eft-limited');
					}

					i++;
				})
			}
		}
	})
}

var listHeaderInterval, counterInterval, actionInterval, listColorInterval;
const settings = {
	"default": {
        "minimalDark": {
			"state": true,
			"subsettings": {
				"dottedLabels": true,
				"backgroundInfluence": true,
				"wideCard": true
			}
		},
        "backgroundGradients": {
			"state": true,
			"subsettings": {
				"gradients": [
		            {
		                "name": "Blue",
                        "colorID": "rgb(0, 121, 191)",
		                "gradient": "linear-gradient(135deg, #0079BF 0%, #1EBDD2 50%, #B5EFA1 100%)",
		                "rotation": "135",
		                "colors": [
		                    { "hex": "#0079BF", "pos": "0" },
		                    { "hex": "#1EBDD2", "pos": "50" },
		                    { "hex": "#B5EFA1", "pos": "100" }
		                ]
		            },{
		                "name": "Orange",
                        "colorID": "rgb(210, 144, 52)",
		                "gradient": "linear-gradient(135deg, #D29034 0%, #EB9606 50%, #2A241C 100%)",
		                "rotation": "135",
		                "colors": [
		                    { "hex": "#D29034", "pos": "0" },
		                    { "hex": "#EB9606", "pos": "50" },
		                    { "hex": "#2A241C", "pos": "100" }
		                ]
		            },{
		                "name": "Green",
                        "colorID": "rgb(81, 152, 57)",
		                "gradient": "linear-gradient(135deg, #519839 0%, #A3D21E 50%, #B5EFA1 100%)",
		                "rotation": "135",
		                "colors": [
		                    { "hex": "#519839", "pos": "0" },
		                    { "hex": "#A3D21E", "pos": "50" },
		                    { "hex": "#B5EFA1", "pos": "100" }
		                ]
		            },{
		                "name": "Red",
                        "colorID": "rgb(176, 70, 50",
		                "gradient": "linear-gradient(135deg, #BA311B 0%, #D2881E 75%, #D37319 100%)",
		                "rotation": "135",
		                "colors": [
		                    { "hex": "#BA311B", "pos": "0" },
		                    { "hex": "#D2881E", "pos": "75" },
		                    { "hex": "#D37319", "pos": "100" }
		                ]
		            },{
		                "name": "Purple",
                        "colorID": "rgb(137, 96, 158)",
		                "gradient": "linear-gradient(135deg, #5461C0 0%, #801ED2 47%, #963CD3 79%, #972ED8 100%)",
		                "rotation": "135",
		                "colors": [
		                    { "hex": "#5461C0", "pos": "0" },
		                    { "hex": "#801ED2", "pos": "47" },
		                    { "hex": "#963CD3", "pos": "79" },
		                    { "hex": "#972ED8", "pos": "100" }
		                ]
		            },{
		                "name": "Pink",
                        "colorID": "rgb(205, 90, 145)",
		                "gradient": "linear-gradient(135deg, #EA537D 0%, #D04FD0 50%, #D415FF 100%)",
		                "rotation": "135",
		                "colors": [
		                    { "hex": "#EA537D", "pos": "0" },
		                    { "hex": "#D04FD0", "pos": "50" },
		                    { "hex": "#D415FF", "pos": "100" }
		                ]
		            },{
		                "name": "Light Green",
                        "colorID": "rgb(75, 191, 107)",
		                "gradient": "linear-gradient(135deg, #4BBF6B 0%, #4FD0C1 50%, #15ABFF 100%)",
		                "rotation": "135",
		                "colors": [
		                    { "hex": "#4BBF6B", "pos": "0" },
		                    { "hex": "#4FD0C1", "pos": "50" },
		                    { "hex": "#15ABFF", "pos": "100" }
		                ]
		            },{
		                "name": "Light Blue",
                        "colorID": "rgb(0, 174, 204)",
		                "gradient": "linear-gradient(135deg, #00C0FF, #C301FF)",
		                "rotation": "135",
		                "colors": [
		                    { "hex": "#00C0FF", "pos": "0" },
		                    { "hex": "#C301FF", "pos": "100" }
		                ]
		            },{
		                "name": "Grey",
                        "colorID": "rgb(131, 140, 145)",
		                "gradient": "linear-gradient(135deg, #838C91, #424242)",
		                "rotation": "135",
		                "colors": [
		                    { "hex": "#838C91", "pos": "0" },
		                    { "hex": "#424242", "pos": "100" }
		                ]
		            }
		        ]
			}
		},
        "cardCounter": {
			"state": true,
			"subsettings": {
				"warningColors": true,
                "harshLimits": true
			}
		},
        "actionSnapping": { "state": true },
        "listColors": {
			"state": true,
			"subsettings": {
				"presets": ['#fd0033', '#ffa204', '#38b8f5', '#71da07', '#c027fa'],
				"boards": { }
			}
		}
    },
	"save": (options) => {
		chrome.storage.sync.set(options, () => { console.log('Settings saved...', options); });
	},
	"get": (callback) => {
		chrome.storage.sync.get(settings.default, (items) => { callback(items); });
	},
	"apply": {
		"minimalDark": (options) => {
			let listHeaders = Array.from(document.querySelectorAll('.list-header-name'));
			if (options.state) {
				stylesheet.add('link', 'minimalDark-core', 'minimalDark/core');

				for (var sub in options.subsettings) {
					if (options.subsettings[sub] == true) { stylesheet.add('link', 'minimalDark-'+sub, 'minimalDark/'+sub); }
					else                                  { stylesheet.remove('minimalDark-'+sub); }
				}
			}
			else {
				stylesheet.add('style', 'listHeader', '.list-header-name { width: 200px !important; resize: none !important; }');
				stylesheet.remove('minimalDark-core');
				for (var sub in options.subsettings) {
					if (options.subsettings[sub] == true) { stylesheet.add('link', 'minimalDark-'+sub, 'minimalDark/'+sub); }
					else                                  { stylesheet.remove('minimalDark-'+sub); }
				}
			}
		},
		"backgroundGradients": (options) => {
			if (options.state) {
				let styles = '';
				options.subsettings.gradients.forEach((gradient) => {
					if (gradient.colorID.includes('rgb')) {
						styles += '#classic-body[style*="'+gradient.colorID+'"] #surface { background: '+gradient.gradient+' !important; }';
					}
				});
				stylesheet.update('style', 'backgroundGradients', styles);
			}
			else { stylesheet.remove('backgroundGradients'); }
		},
		"actionSnapping": (options) => {
			let overlay = document.getElementsByClassName('window-overlay')[0];
			let actionSnap = () => {
				if (options.state) {
					let actions = document.getElementsByClassName('window-sidebar')[0];
					let scrollPos = overlay.scrollTop;

					if (document.querySelector('.window-cover')) {
						if (scrollPos >= (128 + document.querySelector('.window-cover').offsetHeight)) {
							actions.style.top = (scrollPos - 40) + 'px';
							actions.classList.add('snapped');
						}
						else { actions.classList.remove('snapped'); }
					}
					else {
						if (scrollPos >= 128) {
							actions.style.top = (scrollPos - 40) + 'px';
							actions.classList.add('snapped');
						}
						else { actions.classList.remove('snapped'); }
					}
				}
			}
			let scroll = () => { window.requestAnimationFrame(() => { actionSnap(); }); }

			if (options.state) {
				// Create Snapped Class
				let styles = '.snapped { position: absolute; right: 0; }';
				stylesheet.add('style', 'actionSnapping', styles);

				overlay.addEventListener('scroll', scroll);
			}
			else { stylesheet.remove('actionSnapping'); }
		},
		"cardCounter": (options) => {
			stylesheet.add('style', 'harshLimits', '.list-eft-limited .placeholder { display: none; pointer-events: none; }')
			// Update Counter Function
			let updateCounter = () => {
				if (options.state) {
					// Total Card Count
					let totalCount = 0;
					if (!document.getElementById('eft-total-card-count') && document.querySelector('.board-header-btns.mod-left')) {
						let headerBtnAppend  = el.get('.board-header-btns.mod-left')[0],
							cardCountDivider = el.create('span', { attributes: { class: 'board-header-btn-divider', id: 'card-count-divider' } }),
							cardCountTotal   = el.create('div', { text: '0 total cards', attributes: { class: 'board-header-btn', id: 'eft-total-card-count' } });
						el.append(headerBtnAppend, cardCountDivider);
						el.append(headerBtnAppend, cardCountTotal);
					}

					// List Counters
					let lists = document.querySelectorAll('.list');
					if (lists) {
						lists.forEach(list => {
							// Check/Create EFT Actions
							if (!list.querySelector('.eft-list-actions')) { list.children[0].append( el.create('div', { attributes: { class: 'eft-list-actions' } }) ); }

							// Check/Create Card Counter
							if (!list.querySelector('.eft-card-count')) {
								list.querySelector('.eft-list-actions').prepend(
									el.create('div', {
										attributes: { class: 'eft-card-count' },
										children: [
											el.create('span', {
												text: '0',
												attributes: { class: 'eft-card-count-number' }
											}),
											el.create('span', {
												text: '/0',
												attributes: { class: 'eft-card-limit eft-card-limit-off' }
											})
										],
										listeners: { click: (event) => {
											let viewportOffset = event.target.getBoundingClientRect(),
												top  = viewportOffset.top,
												left = viewportOffset.left;
											let target = event.target.parentNode,
												targetVal = target.querySelector('.eft-card-limit').innerText.substring(1);


											popover.show(top, left, 'Card Count', [
												el.create('ul', {
													attributes: { class: 'pop-over-list' },
													children: [
														el.create('li', {
															attributes: { class: 'card-limit-value' },
															children: [
																el.create('p', { text: 'Card Limit' }),
																el.create('input', {
																	attributes: { type: 'number', value: targetVal, min: '0', max: '99' },
																	listeners: { input: (event) => {
																		// On Limit Value Change
																		let val = event.target.value;

																		if (val == 0) { target.querySelector('.eft-card-limit').classList.add('eft-card-limit-off'); }
																		else { target.querySelector('.eft-card-limit').classList.remove('eft-card-limit-off'); }

																		target.querySelector('.eft-card-limit').innerText = '/'+val;

																		saveCardLimit();
																		if (options.subsettings.warningColors) { updateCounterColor(); }
																	}}
																})
															]
														})
													]
												})
											]);
										} }
									})
								);
							};

							// Update Count
							let count = 0;
							Array.from(list.querySelector('.list-cards').children).forEach(card => { if (!card.classList.contains('card-composer')) { count++; totalCount++; } });
							list.querySelector('.eft-card-count-number').innerText = count;
						});

						if (el.get('#eft-total-card-count')) { el.get('#eft-total-card-count').innerText = totalCount + ' total cards'; }

						// Update Values & Colors
						setInitLimits();
						if (options.subsettings.warningColors) { updateCounterColor(); }
					}
				}
				else {
					let cardCountDivider = el.get('#card-count-divider');
					if (cardCountDivider) { cardCountDivider.parentNode.removeChild(cardCountDivider); }

					let totalCardCount = el.get('#eft-total-card-count');
					if (totalCardCount) { totalCardCount.parentNode.removeChild(totalCardCount); }

					let listCardCounts = el.get('.eft-card-count');
					if (listCardCounts) { listCardCounts.forEach((count) => { count.parentNode.removeChild(count); }); }
				}
			}

			if (options.state) {
				let styles = '#eft-total-card-count { padding: 0 6px; }';
				stylesheet.add('style', 'cardCounter', styles);

				// Update The Counters
				updateCounter();
				counterInterval = setInterval(() => { updateCounter(); }, 1000);

				// Set Initial Limit Numbers
				setInitLimits();
			}
			else {
				stylesheet.remove('cardCounter');
				clearInterval(counterInterval);
				updateCounter();
			}
		},
		"listColors": (options) => {
			if (options.state) {
				console.log('listColors on');
				// Save List Colors
				let saveListColors = () => {
					settings.get(options => {
						let s = {};
						s.listColors = options.listColors;

						let boardStyle = document.getElementById('board').className.split(' ').find(el => { return el.indexOf('eft-list-color-') !== -1 });
						let lists = document.querySelectorAll('.list');
						if (lists) {
							let colors = [];
							lists.forEach(list => {
								colors.push(list.querySelector('.eft-list-color').style.background);
							});
							s.listColors.subsettings.boards[getBoardID()] = {};
							s.listColors.subsettings.boards[getBoardID()].style = boardStyle;
							s.listColors.subsettings.boards[getBoardID()].colors = colors;
						}

						settings.save(s);
					})
				}

				// Update List C0lor
				let setListColor = (list, color) => {
					list.querySelector('.eft-list-color-element').style.background = color;
					list.querySelector('.eft-list-color').style.background = color;
					saveListColors();
				}

				// Update Actions
				let updateActions = () => {
					let lists = document.querySelectorAll('.list');
					if (lists) {
						lists.forEach(list => {
							// Check/Create EFT Actions
							if (!list.querySelector('.eft-list-actions')) {
								list.children[0].append( el.create('div', { attributes: { class: 'eft-list-actions' } }) );
							}

							// Check/Create List Color Action
							if (!list.querySelector('.eft-list-color')) {
								list.querySelector('.eft-list-actions').prepend(
									el.create('div', {
										attributes: { class: 'eft-list-color' },
										listeners: { click: (event) => {
											// Define Color Options
											let colorOptions = [
												el.create('div', {
													attributes: { class: 'eft-lc-transparent', 'data-color': 'transparent' },
													listeners: { click: (event) => {
														setListColor(list, 'transparent');
													} }
												})
											];
											settings.get(opts => {
												opts.listColors.subsettings.presets.forEach(preset => {
													colorOptions.push( el.create('div', {
														style: { background: preset },
														attributes: { 'data-color': preset },
														listeners: { click: (event) => {
															setListColor(list, event.target.style.background);
														} }
													}) );
												});
												console.log(colorOptions);
											});
											/* colorOptions.push(
												el.create('div', {
													attributes: { class: 'eft-lc-custom' }
												})
											); */


											// Calculate Style Options
											let styles = ['skew', 'top-border', 'left-border', 'fill', 'half-fill'];
											let optionsEl = [];
											let boardStyle = document.getElementById('board').className.split(' ').find(el => { return el.indexOf('eft-list-color-') !== -1 });
											styles.forEach(style => {
												console.log(style, boardStyle);
												if ('eft-list-color-'+style === boardStyle) {
													optionsEl.push(
														el.create('option', { text: toTitleCase(style.replace('-', ' ')), attributes: { value: style, selected: true } })
													);
												} else {
													optionsEl.push(
														el.create('option', { text: toTitleCase(style.replace('-', ' ')), attributes: { value: style } })
													);
												}
											});


											// Call Popover
											let viewportOffset = event.target.getBoundingClientRect(),
												top  = viewportOffset.top,
												left = viewportOffset.left;
											setTimeout(() => {
												popover.show(top, left, 'List Color', [
												el.create('ul', {
													attributes: { class: 'pop-over-list' },
													children: [ el.create('li', {
														children: [
															el.create('div', {
																attributes: { class: 'eft-list-colors' },
																children: colorOptions
															}),
															el.create('form', {
																children: [
																	el.create('span', {
																		children: [
																			el.create('label', {
																				text: 'Board Style',
																				attributes: { for: 'eft-list-color-style' }
																			}),
																			el.create('select', {
																				attributes: { class: 'eft-list-color-style' },
																				children: optionsEl,
																				listeners: { change: (event) => {
																					document.getElementById('board').classList.remove('eft-list-color-skew');
																					document.getElementById('board').classList.remove('eft-list-color-top-border');
																					document.getElementById('board').classList.remove('eft-list-color-left-border');
																					document.getElementById('board').classList.remove('eft-list-color-fill');
																					document.getElementById('board').classList.remove('eft-list-color-half-fill');

																					document.getElementById('board').classList.add('eft-list-color-'+event.target.value);

																					saveListColors();
																				} }
																			})
																		]
																	})
																]
															})
														]
													}) ]
												})
											])
											}, 20)
										} }
									})
								);
							}

							// Check/Create List Color Element
							if (!list.querySelector('.eft-list-color-element')) {
								list.prepend(
									el.create('div', { attributes: { class: 'eft-list-color-element' } })
								);
							}
						})
					}
				}
				updateActions();
				actionInterval = setInterval(() => { updateActions(); }, 1000);

				// Set Init Colors
				let applyListColors = () => {
					settings.get(options => {
						if (options.listColors.subsettings.boards[getBoardID()]) {
							// Board Style
							if (document.getElementById('board')) { document.getElementById('board').classList.add(options.listColors.subsettings.boards[getBoardID()].style) }

							// List Colors
							let i = 0;
							options.listColors.subsettings.boards[getBoardID()].colors.forEach(col => {
								let lists = document.querySelectorAll('.list');
								if (lists) {
									lists[i].querySelector('.eft-list-color-element').style.background = col;
									lists[i].querySelector('.eft-list-color').style.background = col;
								}

								i++;
							})
						}
						else { if (document.getElementById('board')) { document.getElementById('board').classList.add('eft-list-color-skew'); } }
					})
				}
				applyListColors();
				listColorInterval = setInterval(() => { applyListColors(); }, 1000);
			}
			else {
				console.log('listColors off');

				clearInterval(actionInterval);
				clearInterval(listColorInterval);

				let lists = document.querySelectorAll('.list');
				lists.forEach(list => {
					let colorElement = list.querySelector('.eft-list-color-element');
					if (colorElement) { colorElement.parentNode.removeChild(colorElement); }

					let colorPicker = list.querySelector('.eft-list-color');
					if (colorPicker) { colorPicker.parentNode.removeChild(colorPicker); }
				});
			}
		}
	}
};

// Listen for Realtime Messages from extension
chrome.runtime.onMessage.addListener((req, sender, res) => {
	for (var option in req) { settings.apply[option]( req[option] ); }
});


// On Window Load
window.addEventListener('load', () => {
	// Initial Load
	settings.get(options => {
		console.log('Initialized Ergo with settings:', options);
		for (var key in options) { settings.apply[key](options[key]); }
		stylesheet.add('link', 'listActions', 'listActions');
	});
});
