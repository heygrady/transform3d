
/*!
 * jQuery 3d Transform v@VERSION
 * http://wiki.github.com/heygrady/transform3d/
 *
 * Copyright 2010, Grady Kuhnline
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 * 
 * Date: 
 */
///////////////////////////////////////////////////////
// Transform 3d
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	// Steal some code from Modernizr
	var m = document.createElement( 'modernizr' ),
		m_style = m.style,
		docElement = document.documentElement;
		
	// Capture some basic properties
	var vendorPrefix               = getVendorPrefix(),
		transformProperty          = vendorPrefix !== null ? vendorPrefix + 'transform' : false,
		transformOriginProperty    = vendorPrefix !== null ? vendorPrefix + 'transform-origin' : false,
		perspectiveProperty        = vendorPrefix !== null ? vendorPrefix + 'perspective' : false,
		perspectiveOriginProperty  = vendorPrefix !== null ? vendorPrefix + 'perspective-origin' : false,
		backfaceVisibilityProperty = vendorPrefix !== null ? vendorPrefix + 'backface-visibility' : false;
	
	// store support in the jQuery Support object
	$.support.csstransforms3d = supportCssTransforms3d();
	
	$.extend({
		transform3d: function(elem) {
			/**
			 * The element we're working with
			 * @var jQueryCollection
			 */
			this.$elem = $(elem);
			
			this.outerHeight = 0;
			this.outerWidth = 0;
			
			/**
			 * @var jQueryCollection
			 */
			this.$patches = null;
			this.$wrapper = null;
			this.$perspective = null;
			
			this.options = {
				quality: 5, // lower is faster, 9 is huge
				nudge: 1.00,
				preserve: false,
				transform: 'default', // default|area|quadrant
				perspectiveSelector: null
			};
			this.attr = null;
			this.transformProperty = transformProperty;
			this.transformOriginProperty = transformOriginProperty;
			this.perspectiveProperty = perspectiveProperty;
			this.perspectiveOriginProperty = perspectiveOriginProperty;
			this.backfaceVisibilityProperty = backfaceVisibilityProperty;
			
			this.wrapperClass = 'transform3d-wrapper';
			this.patchClass = 'transform3d-patch';
			this.perspectiveClass = 'transform3d-perspective';
		}
	});
	
	/**
	 * Create Transform as a jQuery plugin
	 * @param Object funcs
	 * @param Object options
	 */
	$.fn.transform3d = function(funcs, options) {
		return this.each(function() {
			var t = this.transform3d || new $.transform3d(this);
			if (funcs) {
				t.exec(funcs, options);
			}
		});
	};
	
	$.transform3d.prototype = {
		exec: function(funcs, options) {
			// extend options
			this.options = $.extend(true, this.options, options);
			
			// capture attrubutes
			this.attr = null;
			if (this.options.preserve) {
				funcs = $.extend(true, this.getAttrs(true, true), funcs);
			} else {
				funcs = $.extend(true, {}, funcs); // copy the object to prevent weirdness
			}
			this.setAttrs(funcs);
			
			// For supported browsers, take the easy way out
			if ($.support.csstransforms3d) {
				//TODO: Safari-only Code
			}
			
			// Make 9 the highest quality
			if (this.options.quality > 9) {
				this.options.quality = 9;
			} else if (this.options.quality < 1) {
				this.options.quality = 1;
			}
			
			// remember the height an width
			this.outerHeight = this.$elem.outerHeight();
			this.outerWidth = this.$elem.outerWidth();
			
			// Ensure the element is wrapped
			if (!this.$wrapper) {
				this.$wrapper = this.$elem.wrap('<div class="' + this.wrapperClass + '">').parent();
				this.$wrapper.css({position: 'relative'});
				this.fixOpacity();
				this.fixPosition();
			}
			
			// Handle the perspective
			var selector = this.options.perspectiveSelector;
			if (selector) {
				this.$perspective = this.$elem.closest(selector).addClass(this.perspectiveClass);
				
				var pcenter = this.getCenterOffset(this.$perspective),
					ecenter = this.getCenterOffset(this.$elem);
					
				
				if (funcs.perspective && (pcenter.top != ecenter.top || pcenter.left != ecenter.left)) {
					var ex = pcenter.left - ecenter.left,
						ey = pcenter.top - ecenter.top;
					funcs.perspective = [
						funcs.perspective,
						ex,
						ey
					];
					var pos = this.$wrapper.position();
					this.$wrapper.css({
						top: pos.top + ey + 'px',
						left: pos.left + ex + 'px'
					});
				}
				//console.log(pcenter, ecenter);
			}
			
			// 1. prep the element by dividing it into pieces
			this.createPatches();
			
			// 2. create the proper matrix
			this.execMatrix(funcs);
			this.$elem.css('visibility', 'hidden');
		},
		
		/**
		 * Applies all of the transformations as a matrix
		 * @param Object funcs
		 */
		execMatrix: function(funcs) {
			var matrix,
				tempMatrix,
				args;
			
			// collect all the matrices
			for (var func in funcs) {
				if ($.matrix[func]) {
					args = $.isArray(funcs[func]) ? funcs[func] : [funcs[func]];
					
					// strip the units
					// TODO: should probably convert the units properly instead of just stripping them
					args = $.map(args, stripUnits);
					
					// TODO: translation, origin and perspective should be applied last
					
					tempMatrix = $.matrix[func].apply(this, args);
					matrix = matrix ? matrix.x(tempMatrix) : tempMatrix;
				} else if (func == 'origin') {
					//TODO: origin, perspective-origin
					//args = $.isArray(funcs[func]) ? funcs[func] : [funcs[func]];
					//this[func].apply(this, args);
				}
			}
			if ($.isArray(funcs.perspective)) {
				var ex = funcs.perspective[1] || 0;
					ey = funcs.perspective[2] || 0;
				//matrix = matrix.x($.matrix.translate3d(ex, ey));
			}
			
			//prep variables for the loop
			var calc = new $.matrix.calc(matrix, this.outerHeight, this.outerWidth),
				m, solve,
				corners = ['tl', 'tr', 'br', 'bl'],
				next = {
					tl: ['tl', 'tr', 'bl'],
					tr: ['tr', 'br', 'tl'],
					br: ['br', 'bl', 'tr'],
					bl: ['bl', 'tl', 'br']
				},
				$patch;
			
			// loop each patch	
			for (var i = 0, len = this.$patches.length; i < len; i++) {
				// determine the coordinates for each corner of the patch
				var a = this.getPatchCorners(i, true);
				
				// 3d transform the corners
				var c = {
					tl: calc.coord(a.tl.e(1), a.tl.e(2), 0),
					tr: calc.coord(a.tr.e(1), a.tr.e(2), 0),
					br: calc.coord(a.br.e(1), a.br.e(2), 0),
					bl: calc.coord(a.bl.e(1), a.bl.e(2), 0)
				};
				
				// Decide which corner to 2d transform
				var la;
				if (this.options.transform == 'quadrant') {
					if (c.tl.e(1) <= 0 && c.tl.e(2) <= 0) {
						la = next.tl;	
					} else if (c.tr.e(1) >= 0 && c.tr.e(2) <= 0) {
						la = next.tr;	
					} else if (c.br.e(1) >= 0 && c.br.e(2) >= 0) {
						la = next.br;
					} else if (c.bl.e(1) <= 0 && c.bl.e(2) >= 0) {
						la = next.bl;
					}
				} else {
					var x = this.outerWidth, //TODO: safeOuterWidth
						y = this.outerHeight, //TODO: safeOuterHeight
						ox = x/2, //offset x
						oy = y/2, //offset y
						areaOnly =  (this.options.transform == 'area');
					
					// force the edges to be line up
					if (!areaOnly && ((a.tl.e(1) < 0 && a.tl.e(2) == 0-oy) || (a.tl.e(1) == 0-ox && a.tl.e(2) < 0))) {
						la = next.tl;	
					} else if (!areaOnly && ((a.tr.e(1) > 0 && a.tr.e(2) == 0-oy) || (a.tr.e(1) == x-ox && a.tr.e(2) < 0))) {
						la = next.tr;	
					} else if (!areaOnly && ((a.br.e(1) > 0 && a.br.e(2) == y-oy) || (a.br.e(1) == x-ox && a.br.e(2) > 0))) {
						la = next.br;
					} else if (!areaOnly && ((a.bl.e(1) < 0 && a.bl.e(2) == y-oy) || (a.bl.e(1) == 0-ox && a.bl.e(2) > 0))) {
						la = next.bl;
					} else {
						// use the largest area for the middle patches
						var area = {
							tl: ((c.tr.e(1)-c.tl.e(1))*(c.bl.e(2)-c.tl.e(2))-(c.bl.e(1)-c.tl.e(1))*(c.tr.e(2)-c.tl.e(2)))/2,
							tr: ((c.br.e(1)-c.tr.e(1))*(c.tl.e(2)-c.tr.e(2))-(c.tl.e(1)-c.tr.e(1))*(c.br.e(2)-c.tr.e(2)))/2,
							br: ((c.bl.e(1)-c.br.e(1))*(c.tr.e(2)-c.br.e(2))-(c.tr.e(1)-c.br.e(1))*(c.bl.e(2)-c.br.e(2)))/2,
							bl: ((c.tl.e(1)-c.bl.e(1))*(c.br.e(2)-c.bl.e(2))-(c.br.e(1)-c.bl.e(1))*(c.tl.e(2)-c.bl.e(2)))/2
						};
						
						// find the largest corner
						var corner,
							pa = 0; // temp previous area
						
						for (var j = 0; j > 4, corner = corners[j]; j++) {
							if (area[corner] > pa) {
								la = next[corner];
							}
						}
					}
				}
				// TODO: if this.$elem is in a fragment la in undefined
				
				// create a inverse matrix for our corner
				var m = (new $.matrix.M3x3(
							a[la[0]].e(1), a[la[0]].e(2), 1,
							a[la[2]].e(1), a[la[2]].e(2), 1,
							a[la[1]].e(1), a[la[1]].e(2), 1
						)).inverse();
				//TODO: cache the solution matrix based on the ratio
				
				// solve a matrix for that corner's x and y
				var solve = {
					x: m.x(new $.matrix.V3(
							c[la[0]].e(1),
							c[la[2]].e(1),
							c[la[1]].e(1)
						)),
					y: m.x(new $.matrix.V3(
							c[la[0]].e(2),
							c[la[2]].e(2),
							c[la[1]].e(2)
						))
				};

				// get our patch
				$patch = this.$patches.eq(i);
				
				// Transform the element
				$patch.transform({matrix: [
					parseFloat(solve.x.e(1).toFixed(6)), parseFloat(solve.y.e(1).toFixed(6)),
					parseFloat(solve.x.e(2).toFixed(6)), parseFloat(solve.y.e(2).toFixed(6)),
					parseFloat(solve.x.e(3).toFixed(6)), parseFloat(solve.y.e(3).toFixed(6))
				]});
				
				// Apply the correct clip
				// TODO: This can be skipped if it's already clipped
				var b = this.getPatchCorners(i),
					clip = 'rect(' +
						parseFloat((b.tl.e(2) / this.options.nudge).toFixed(6)) + 'px, ' +
						parseFloat((b.br.e(1) * this.options.nudge).toFixed(6)) + 'px, ' +
						parseFloat((b.br.e(2) * this.options.nudge).toFixed(6)) + 'px, ' +
						parseFloat((b.tl.e(1) / this.options.nudge).toFixed(6)) + 'px)';
				
				// TODO: IE can't really use css clip, maybe use VML
				if ($.browser.msie && $.browser.version < 8) {
					clip = clip.replace(',', '', 'g');
				} 
				$patch.css({
					clip: clip,
					'z-index': Math.round(c[la[0]].e(3))
				});			
			}
			this.$wrapper.css('z-index', Math.round(calc.coord(0, 0, 0).e(3)));
		},
		
		getPatchCorners: function(i, center) {
			var quality = this.options.quality,
				count = quality * quality,
				col = i % quality,
				row = Math.floor(i/quality);
				
			var x = this.outerWidth, //TODO: safeOuterWidth
				y = this.outerHeight, //TODO: safeOuterHeight
				patchX = x / quality,
				patchY = y / quality,
				px = (row) * patchX,
				py = (col) * patchY;
				
			// center the origin
			if (center) {
				px = px - x/2;
				py = py - y/2;
			}
			return {
				tl: new $.matrix.V2(px, py),
				tr: new $.matrix.V2(px + patchX, py),
				br: new $.matrix.V2(px + patchX, py + patchY),
				bl: new $.matrix.V2(px, py + patchY)
			}
		},
		
		createPatches: function() {
			var quality = this.options.quality,
				count = quality * quality;
			
			// re-find all of the patches
			this.$patches = this.$wrapper.children('.' + this.patchClass);
			if (this.$patches.length < count) {
				var fragment = document.createDocumentFragment(),
					$patch,
					i = this.$patches.length;
				
				// create a prototype patch
				var $prototype = this.$elem.clone().css({
						position: 'absolute',
						top: 0,
						left: 0,
						//overflow: 'hidden',
						height: this.$elem.height() + 'px',
						width: this.$elem.width() + 'px'
					}).addClass(this.patchClass);
				
				// add new patches to the fragment
				do {
					fragment.appendChild($prototype.clone()[0]);
					i++;
				} while(i < count)
				
				// Add the fragment to the
				this.$wrapper.append(fragment.cloneNode(true));
				this.$patches = this.$wrapper.children('.' + this.patchClass);
			} else if (this.$patches.length > count) {
				//we have too many
				var i = this.$patches.length;
				do {
					i--;
					this.$patches.eq(i).remove();
				} while (i > count);
			}
		},
		
		fixOpacity: function() {
			var opacity = this.$elem.css('opacity');
			
			// transfer the opacity to the wrapper
			if (opacity && opacity != 1) {
				this.$elem.css('opacity', 1);
				this.$wrapper.css('opacity', opacity);
			}
		},
		
		fixPosition: function() {
			var pos = this.$elem.css('position');
			
			if (pos !== 'static') {
				// place the element before the wrapper
				this.$wrapper.before(this.$elem);
				
				// gather some information from the element
				var position = this.$elem.position();
				this.$elem.css({top: 0, left: 0});
				this.$wrapper.css({
					position: pos,
					top: position.top,
					left: position.left
				});
				
				// place the element back inside the wrapper
				this.$wrapper.prepend(this.$elem);
			}
		},
		
		getCenterOffset: function($elem) {
			var offset = $elem.offset(),
				height = $elem.outerHeight(),
				width = $elem.outerWidth();
			
			return {
				top: offset.top + height / 2,
				left: offset.left + width / 2
			};
		}
	};
	
	function stripUnits(arg) {
		return parseFloat(arg);
	}
	
	/**
	 * Find the prefix that this browser uses
	 */	
	function getVendorPrefix() {
		var property = {
			transformProperty : '',
			MozTransform : '-moz-',
			WebkitTransform : '-webkit-',
			OTransform : '-o-',
			msTransform : '-ms-'
		};
		for (var p in property) {
			if (typeof m_style[p] != 'undefined') {
				return property[p];
			}
		}
		return null;
	}
	
	/**
	 * Test if this browser supports 3d
	 */	
	function supportCssTransforms3d() {
		if (typeof(window.Modernizr) !== 'undefined') {
			return Modernizr.csstransforms3d;
		}
		
		var props = [ 'perspectiveProperty', 'WebkitPerspective', 'MozPerspective', 'OPerspective', 'msPerspective' ],
			prefixes = ' -o- -moz- -ms- -webkit- -khtml- '.split(' '),
			ret = false;
		for ( var i in props ) {
			if ( m_style[ props[i] ] !== undefined  ) {
				ret = true;
			}
		}
		
		// webkit has 3d transforms disabled for chrome, though
		//   it works fine in safari on leopard and snow leopard
		// as a result, it 'recognizes' the syntax and throws a false positive
		// thus we must do a more thorough check:
		if (ret) {
			var st = document.createElement('style'),
				div = document.createElement('div');
				
			// webkit allows this media query to succeed only if the feature is enabled.	
			// "@media (transform-3d),(-o-transform-3d),(-moz-transform-3d),(-ms-transform-3d),(-webkit-transform-3d),(modernizr){#modernizr{height:3px}}"
			st.textContent = '@media ('+prefixes.join('transform-3d),(')+'modernizr){#modernizr{height:3px}}';
			document.getElementsByTagName('head')[0].appendChild(st);
			div.id = 'modernizr';
			docElement.appendChild(div);
			
			ret = div.offsetHeight === 3;
			
			st.parentNode.removeChild(st);
			div.parentNode.removeChild(div);
		}
		return ret;
	}
})(jQuery, this, this.document);