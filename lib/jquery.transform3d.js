///////////////////////////////////////////////////////
// Transform
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	// Steal some code from Modernizr
	var m = document.createElement( 'modernizr' ),
    	m_style = m.style,
    	docElement = document.documentElement;
    	
	// Capture some basic properties
	var transformPrefix            = getTransformPrefix(),
		transformProperty          = transformPrefix !== null ? transformPrefix + 'transform' : false,
		transformOriginProperty    = transformPrefix !== null ? transformPrefix + 'transform-origin' : false,
		perspectiveProperty        = transformPrefix !== null ? transformPrefix + 'perspective' : false,
		perspectiveOriginProperty  = transformPrefix !== null ? transformPrefix + 'perspective-origin' : false,
		backfaceVisibilityProperty = transformPrefix !== null ? transformPrefix + 'backface-visibility' : false;
	
	// store support in the jQuery Support object
	$.support.cssTransform3d = supportCssTransform3d();
	
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
			 * The element we're working with
			 * @var jQueryCollection
			 */
			this.$patches = null;
			this.$wrapper = null;
			this.options = {
				quality: 5, // lower is faster, 9 is huge
				nudge: 1.04,
				preserve: false,
				transform: 'area' // area|quadrant
			}
			
			this.wrapperClass = 'transform3d-wrapper';
			this.patchClass = 'transform3d-patch';
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
			
			// For supported browsers, take the easy way out
			if ($.support.cssTransform3d) {
				//TODO: Safari Code
			}
			
			// Make 9 the highest quality
			if (this.options.quality > 9) {
				this.options.quality = 9;
			}
			
			// remember the height an width
			this.outerHeight = this.$elem.outerHeight();
			this.outerWidth = this.$elem.outerWidth();
			
			// Ensure the element is wrapped
			if (!this.$wrapper) {
				this.$wrapper = this.$elem.wrap('<div class="' + this.wrapperClass + '">').parent().css({position: 'relative'});
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
					//console.log(func);
					args = $.isArray(funcs[func]) ? funcs[func] : [funcs[func]];
					
					// strip the units
					// TODO: should probably convert the units properly instead of just stripping them
					args = $.map(args, stripUnits);
					
					tempMatrix = $.matrix[func].apply(this, args);
					matrix = matrix ? matrix.x(tempMatrix) : tempMatrix;
					//console.log(func, matrix.elements);
				} else if (func == 'origin') {
					//TODO: origin, perspective-origin
					//args = $.isArray(funcs[func]) ? funcs[func] : [funcs[func]];
					//this[func].apply(this, args);
				} else {
					console.log('!'+func);
				}
			}
//			console.log($.map(matrix.elements, function(val){return parseFloat(val.toFixed(6))}));
			
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
				
				// transform the corners
				var c = {
					tl: calc.coord(a.tl.e(1), a.tl.e(2), 0),
					tr: calc.coord(a.tr.e(1), a.tr.e(2), 0),
					br: calc.coord(a.br.e(1), a.br.e(2), 0),
					bl: calc.coord(a.bl.e(1), a.bl.e(2), 0)
				};
				
				// Decide which corner to transform
				var la;
				if (this.options.transform == 'area') {
					var x0 = c.tl.e(1), //tl
						y0 = c.tl.e(2),
						x1 = c.tr.e(1), //tr
						y1 = c.tr.e(2),
						x2 = c.br.e(1), //br
						y2 = c.br.e(2),
						x3 = c.bl.e(1), //bl
						y3 = c.bl.e(2);
						
					var x = this.outerWidth, //TODO: safeOuterWidth
						y = this.outerHeight, //TODO: safeOuterHeight
						ox = x/2, //offset x
						oy = y/2; //offset y
					
					// force the edges to be smooth
					if (a.tl.e(1) < 0 && a.tl.e(2) == 0-oy || a.tl.e(1) == 0-ox && a.tl.e(2) < 0) {
						la = next.tl;	
					} else if (a.tr.e(1) > 0 && a.tr.e(2) == 0-oy || a.tr.e(1) == x-ox && a.tr.e(2) < 0) {
						la = next.tr;	
					} else if (a.br.e(1) > 0 && a.br.e(2) == y-oy || a.br.e(1) == x-ox && a.br.e(2) > 0) {
						la = next.br;
					} else if (a.bl.e(1) < 0 && a.bl.e(2) == y-oy || a.bl.e(1) == 0-ox && a.bl.e(2) > 0) {
						la = next.bl;
					} else {
						// use the largest area for the middle
						var area = {
							tl: ((x1-x0)*(y3-y0)-(x3-x0)*(y1-y0))/2,
							tr: ((x2-x1)*(y0-y1)-(x0-x1)*(y2-y1))/2,
							br: ((x3-x2)*(y1-y2)-(x1-x2)*(y3-y2))/2,
							bl: ((x0-x3)*(y2-y3)-(x2-x3)*(y0-y3))/2
						}
						
						// find the largest corner
						var corner,
							pa = 0; // temp previous area
						
						for (var j = 0; j > 4, corner = corners[j]; j++) {
							if (area[corner] > pa) {
								la = next[corner];
							}
						}
					}
				} else {
					if (c.tl.e(1) <= 0 && c.tl.e(2) <= 0) {
						la = next.tl;	
					} else if (c.tr.e(1) >= 0 && c.tr.e(2) <= 0) {
						la = next.tr;	
					} else if (c.br.e(1) >= 0 && c.br.e(2) >= 0) {
						la = next.br;
					} else if (c.bl.e(1) <= 0 && c.bl.e(2) >= 0) {
						la = next.bl;
					}
				}
				
				// create a inverse matrix for our corner
				var m = (new $.matrix.M3x3(
							a[la[0]].e(1), a[la[0]].e(2), 1,
							a[la[2]].e(1), a[la[2]].e(2), 1,
							a[la[1]].e(1), a[la[1]].e(2), 1
						)).inverse();
					
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
				//TODO: cache the solution based on the ratio
				
				
				// get our patch
				$patch = this.$patches.eq(i);
				
				// Transform the element
				$patch.transform({matrix: [
					parseFloat(solve.x.e(1).toFixed(8)), parseFloat(solve.y.e(1).toFixed(8)),
					parseFloat(solve.x.e(2).toFixed(8)), parseFloat(solve.y.e(2).toFixed(8)),
					parseFloat(solve.x.e(3).toFixed(8)), parseFloat(solve.y.e(3).toFixed(8))
				]});
				
				// Apply the correct clip
				// TODO: This can be skipped if it's already clipped
				var b = this.getPatchCorners(i);
				$patch.css({
					clip: 'rect(' +
						(b.tl.e(2) / this.options.nudge) + 'px, ' +
						(b.br.e(1) * this.options.nudge) + 'px, ' +
						(b.br.e(2) * this.options.nudge) + 'px, ' +
						(b.tl.e(1) / this.options.nudge) + 'px)'
				});
			}
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
						overflow: 'hidden',
						height: this.$elem.height() + 'px',
						width: this.$elem.width() + 'px',
						visibility: 'visible'
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
		}
	};
	
	function stripUnits(arg) {
		return parseFloat(arg);
	}
	
    /**
     * Find the prefix that this browser uses
     */	
	function getTransformPrefix() {
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
	function supportCssTransform3d() {
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