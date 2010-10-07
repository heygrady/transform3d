/*!
 * jQuery 2d Transform v0.9.0pre
 * http://wiki.github.com/heygrady/transform/
 *
 * Copyright 2010, Grady Kuhnline
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 * 
 * Date: Wed Oct 6 00:38:58 2010 -0700
 */
///////////////////////////////////////////////////////
// Transform
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	/**
	 * @var Regex identify the matrix filter in IE
	 */
	var rmatrix = /progid:DXImageTransform\.Microsoft\.Matrix\(.*?\)/;
	
	// Steal some code from Modernizr
	var m = document.createElement( 'modernizr' ),
		m_style = m.style;
		
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
	
	function supportCssTransforms() {
		if (typeof(window.Modernizr) !== 'undefined') {
			return Modernizr.csstransforms;
		}
		
		var props = [ 'transformProperty', 'WebkitTransform', 'MozTransform', 'OTransform', 'msTransform' ];
		for ( var i in props ) {
			if ( m_style[ props[i] ] !== undefined  ) {
				return true;
			}
		}
	}
		
	// Capture some basic properties
	var vendorPrefix			= getVendorPrefix(),
		transformProperty		= vendorPrefix !== null ? vendorPrefix + 'transform' : false,
		transformOriginProperty	= vendorPrefix !== null ? vendorPrefix + 'transform-origin' : false;
	
	// store support in the jQuery Support object
	$.support.csstransforms = supportCssTransforms();
	
	/**
	 * Class for creating cross-browser transformations
	 * @constructor
	 */
	$.extend({
		transform: function(elem) {
			// Cache the transform object on the element itself
			elem.transform = this;
			
			/**
			 * The element we're working with
			 * @var jQueryCollection
			 */
			this.$elem = $(elem);
						
			/**
			 * Remember the matrix we're applying to help the safeOuterLength func
			 */
			this.applyingMatrix = false;
			this.matrix = null;
			
			/**
			 * Remember the css height and width to save time
			 * This is only really used in IE
			 * @var Number
			 */
			this.height = null;
			this.width = null;
			this.outerHeight = null;
			this.outerWidth = null;
			
			/**
			 * We need to know the box-sizing in IE for building the outerHeight and outerWidth
			 * @var string
			 */
			this.boxSizingValue = null;
			this.boxSizingProperty = null;
			
			this.attr = null;
			this.transformProperty = transformProperty;
			this.transformOriginProperty = transformOriginProperty;
		}
	});
	
	$.extend($.transform, {
		/**
		 * @var Array list of all valid transform functions
		 */
		funcs: ['matrix', 'origin', 'reflect', 'reflectX', 'reflectXY', 'reflectY', 'rotate', 'scale', 'scaleX', 'scaleY', 'skew', 'skewX', 'skewY', 'translate', 'translateX', 'translateY'],
		
		rfunc: {
			/**
			 * @var Regex identifies functions that require an angle unit
			 */
			angle: /^rotate|skew[X|Y]?$/,
			
			/**
			 * @var Regex identifies functions that require a length unit
			 */
			length: /^origin|translate[X|Y]?$/,
			
			/**
			 * @var Regex identifies functions that do not require a unit
			 */
			scale: /^scale[X|Y]?$/,
			
			/**
			 * @var Regex reflection functions
			 */
			reflect: /^reflect(XY|X|Y)?$/
		}
	});
	
	/**
	 * Create Transform as a jQuery plugin
	 * @param Object funcs
	 * @param Object options
	 */
	$.fn.transform = function(funcs, options) {
		return this.each(function() {
			var t = this.transform || new $.transform(this);
			if (funcs) {
				t.exec(funcs, options);
			}
		});
	};	
	
	$.transform.prototype = {
		/**
		 * Applies all of the transformations
		 * @param Object funcs
		 * @param Object options
		 * forceMatrix - uses the matrix in all browsers
		 * preserve - tries to preserve the values from previous runs
		 */
		exec: function(funcs, options) {
			// extend options
			options = $.extend(true, {
				forceMatrix: false,
				preserve: false
			}, options);
	
			// preserve the funcs from the previous run
			this.attr = null;
			if (options.preserve) {
				funcs = $.extend(true, this.getAttrs(true, true), funcs);
			} else {
				funcs = $.extend(true, {}, funcs); // copy the object to prevent weirdness
			}
			
			// Record the custom attributes on the element itself (helps out
			//	the animator)
			this.setAttrs(funcs);
			
			// apply the funcs
			if ($.support.csstransforms && !options.forceMatrix) {
				// CSS3 is supported
				return this.execFuncs(funcs);
			} else if ($.browser.msie || ($.support.csstransforms && options.forceMatrix)) {
				// Internet Explorer or Forced matrix
				return this.execMatrix(funcs);
			}
			return false;
		},
		
		/**
		 * Applies all of the transformations as functions
		 * @param Object funcs
		 */
		execFuncs: function(funcs) {
			var values = [];
			
			// construct a CSS string
			for (var func in funcs) {
				// handle origin separately
				if (func == 'origin') {
					this[func].apply(this, $.isArray(funcs[func]) ? funcs[func] : [funcs[func]]);
				} else if ($.inArray(func, $.transform.funcs) != -1) {
					values.push(this.createTransformFunc(func, funcs[func]));
				}
			}
			this.$elem.css(transformProperty, values.join(' '));
			return true;
		},
		
		/**
		 * Applies all of the transformations as a matrix
		 * @param Object funcs
		 */
		execMatrix: function(funcs) {
			var matrix,
				tempMatrix,
				args;
			
			for (var func in funcs) {
				if ($.matrix[func]) {
					args = $.isArray(funcs[func]) ? funcs[func] : [funcs[func]];
					
					// strip the units
					// TODO: should probably convert the units properly instead of just stripping them
					args = $.map(args, stripUnits);
					
					// TODO: translation and origin should be applied last
					// TODO: should hold translations until the extreme end
					tempMatrix = $.matrix[func].apply(this, args);
					matrix = matrix ? matrix.x(tempMatrix) : tempMatrix;
				} else if (func == 'origin') {
					//TODO: this is a dumb way to handle the origin for a matrix
					args = $.isArray(funcs[func]) ? funcs[func] : [funcs[func]];
					this[func].apply(this, args);
				}
			}
			
			// check that we have a matrix
			// TODO: This will result in a filter being needlessly set in IE
			matrix = matrix || $.matrix.identity();

			// pull out the relevant values
			var a = parseFloat(matrix.e(1,1).toFixed(6)),
				b = parseFloat(matrix.e(2,1).toFixed(6)),
				c = parseFloat(matrix.e(1,2).toFixed(6)),
				d = parseFloat(matrix.e(2,2).toFixed(6)),
				tx = matrix.rows === 3 ? parseFloat(matrix.e(1,3).toFixed(6)) : 0,
				ty = matrix.rows === 3 ? parseFloat(matrix.e(2,3).toFixed(6)) : 0;
			
			//apply the transform to the element
			if ($.support.csstransforms && vendorPrefix === '-moz-') {
				// -moz-
				this.$elem.css(transformProperty, 'matrix(' + a + ', ' + b + ', ' + c + ', ' + d + ', ' + tx + 'px, ' + ty + 'px)');
			} else if ($.support.csstransforms) {
				// -webkit, -o-, w3c
				// NOTE: WebKit and Opera don't allow units on the translate variables
				this.$elem.css(transformProperty, 'matrix(' + a + ', ' + b + ', ' + c + ', ' + d + ', ' + tx + ', ' + ty + ')');
			} else if ($.browser.msie) {
				// IE requires the special transform Filter
				
				//TODO: Use Nearest Neighbor during animation FilterType=\'nearest neighbor\'
				var filterType = ', FilterType=\'nearest neighbor\''; //bilinear
				var style = this.$elem[0].style;
				var matrixFilter = 'progid:DXImageTransform.Microsoft.Matrix(' +
						'M11=' + a + ', M12=' + c + ', M21=' + b + ', M22=' + d +
						', sizingMethod=\'auto expand\'' + filterType + ')';
				var filter = style.filter || jQuery.curCSS( this.$elem[0], "filter" ) || "";
				style.filter = rmatrix.test(filter) ? filter.replace(rmatrix, matrixFilter) : filter ? filter + ' ' + matrixFilter : matrixFilter;
				
				// Let's know that we're applying post matrix fixes and the height/width will be static for a bit
				this.applyingMatrix = true;
				this.matrix = matrix;
				
				// IE can't set the origin or translate directly
				this.fixPosition(matrix, tx, ty);
				
				this.applyingMatrix = false;
				this.matrix = null;
			}
			return true;
		},
		
		/**
		 * Sets the transform-origin
		 * This really needs to be percentages
		 * @param Number x length
		 * @param Number y length
		 */
		origin: function(x, y) {
			// use CSS in supported browsers
			if ($.support.csstransforms) {
				if (typeof y === 'undefined') {
					this.$elem.css(transformOriginProperty, x);
				} else {
					this.$elem.css(transformOriginProperty, x + ' ' + y);
				}
				return true;
			}
			
			// correct for keyword lengths
			switch (x) {
				case 'left': x = '0'; break;
				case 'right': x = '100%'; break;
				case 'center': // no break
				case undefined: x = '50%';
			}
			switch (y) {
				case 'top': y = '0'; break;
				case 'bottom': y = '100%'; break;
				case 'center': // no break
				case undefined: y = '50%'; //TODO: does this work?
			}
			
			// store percentages directly
			if (/%/.test(x) && /%/.test(y)) {
				this.setAttr('origin', [x, y]);
				return true;
			}
			
			// store mixed values with units, assumed pixels
			this.setAttr('origin', [
				/%/.test(x) ? x : parseFloat(x) + 'px',
				/%/.test(y) ? y : parseFloat(y) + 'px'
			]);
			return true;
		},
		
		/**
		 * Create a function suitable for a CSS value
		 * @param string func
		 * @param Mixed value
		 */
		createTransformFunc: function(func, value) {
			if ($.transform.rfunc.reflect.test(func)) {
				// let's fake reflection
				// TODO: why would value be false?
				var matrix = value ? $.matrix[func]() : $.matrix.identity(),
					a = matrix.e(1,1),
					b = matrix.e(2,1),
					c = matrix.e(1,2),
					d = matrix.e(2,2);
				return 'matrix(' + a + ', ' + b + ', ' + c + ', ' + d + ', 0, 0)';
			}
			
			value = _correctUnits(func, value);
			
			if  (!$.isArray(value)) {
				return func + '(' + value + ')';
			} else if (func == 'matrix') {
				if (vendorPrefix === '-moz-' && value[4]) {
					value[4] = value[4] +'px';
				}
				if (vendorPrefix === '-moz-' && value[5]) {
					value[5] = value[5] +'px';
				}
				return 'matrix(' + value[0] + ', ' + value[1] + ', ' + value[2] + ', ' + value[3] + ', ' + (value[4] || 0) + ', ' + (value[5] || 0) + ')';
			} else {
				return func + '(' + value[0] + ', ' + value[1] + ')';
			}
		},
		
		/**
		 * @param Matrix matrix
		 * @param Number tx
		 * @param Number ty
		 * @param Number height
		 * @param Number width
		 */
		fixPosition: function(matrix, tx, ty, height, width) {
			// now we need to fix it!
			var	calc = new $.matrix.calc(matrix, this.safeOuterHeight(), this.safeOuterWidth()),
				origin = this.getAttr('origin'); // mixed percentages and px
				
			// translate a 0, 0 origin to the current origin
			var offset = calc.originOffset(new $.matrix.V2(
				/%/.test(origin[0]) ? parseFloat(origin[0])/100*calc.outerWidth : parseFloat(origin[0]),
				/%/.test(origin[1]) ? parseFloat(origin[1])/100*calc.outerHeight : parseFloat(origin[1])
			));
			
			// IE glues the top-most and left-most pixels of the transformed object to top/left of the original object
			//TODO: This seems wrong in the calculations
			var sides = calc.sides();

			// Protect against an item that is already positioned
			var cssPosition = this.$elem.css('position');
			if (cssPosition == 'static') {
				cssPosition = 'relative';
			}
			
			//TODO: if the element is already positioned, we should attempt to respect it (somehow)
			//NOTE: we could preserve our offset top and left in an attr on the elem
			var pos = {top: 0, left: 0};
			
			// Approximates transform-origin, tx, and ty
			var css = {
				'position': cssPosition,
				'top': (offset.top + ty + sides.top + pos.top) + 'px',
				'left': (offset.left + tx + sides.left + pos.left) + 'px',
				'zoom': 1
			};

			this.$elem.css(css);
		}
	};
	
	/**
	 * Ensure that values have the appropriate units on them
	 * @param string func
	 * @param Mixed value
	 */
	var rfxnum = /^([\+\-]=)?([\d+.\-]+)(.*)$/;
	function _correctUnits(func, value) {
		var result = !$.isArray(value)? [value] : value,
			rangle = $.transform.rfunc.angle,
			rlength = $.transform.rfunc.length;
		
		for (var i = 0, len = result.length; i < len; i++) {
			var parts = rfxnum.exec(result[i]),
				unit = '';
			
			// Use an appropriate unit
			if (rangle.test(func)) {
				unit = 'deg';
				
				// remove nonsense units
				if (parts[3] && !$.angle.runit.test(parts[3])) {
					parts[3] = null;
				}
			} else if (rlength.test(func)) {
				unit = 'px';
			}
			
			// ensure a value and appropriate unit
			if (!parts) {
				result[i] = 0 + unit;
			} else if(!parts[3]) {
				result[i] += unit;
			}
			
		}
		return len == 1 ? result[0] : result;
	}
})(jQuery, this, this.document);


///////////////////////////////////////////////////////
// Safe Outer Length
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	$.extend($.transform.prototype, {
		/**
		 * @param void
		 * @return Number
		 */
		safeOuterHeight: function() {
			return this.safeOuterLength('height');
		},
		
		/**
		 * @param void
		 * @return Number
		 */
		safeOuterWidth: function() {
			return this.safeOuterLength('width');
		},
		
		/**
		 * Returns reliable outer dimensions for an object that may have been transformed.
		 * Only use this if the matrix isn't handy
		 * @param String dim height or width
		 * @return Number
		 */
		safeOuterLength: function(dim) {
			var funcName = 'outer' + (dim == 'width' ? 'Width' : 'Height');
			
			if ($.browser.msie) {
				// make the variables more generic
				dim = dim == 'width' ? 'width' : 'height';
				
				// if we're transforming and have a matrix; we can shortcut.
				// the true outerHeight is the transformed outerHeight divided by the ratio.
				// the ratio is equal to the height of a 1px by 1px box that has been transformed by the same matrix.
				if (this.applyingMatrix && !this[funcName] && this.matrix) {
					// calculate and return the correct size
					var calc = new $.matrix.calc(this.matrix, 1, 1),
						ratio = calc.offset(),
						length = this.$elem[funcName]() / ratio[dim];
					this[funcName] = length;
					
					return length;
				} else if (this.applyingMatrix && this[funcName]) {
					// return the cached calculation
					return this[funcName];
				}
				
				// map dimensions to box sides			
				var side = {
					height: ['top', 'bottom'],
					width: ['left', 'right']
				};
				
				// setup some variables
				var elem = this.$elem[0],
					outerLen = parseFloat($.curCSS(elem, dim, true)), //TODO: this can be cached on animations that do not animate height/width
					boxSizingProp = this.boxSizingProperty,
					boxSizingValue = this.boxSizingValue;
				
				// IE6 && IE7 will never have a box-sizing property, so fake it
				if (!this.boxSizingProperty) {
					boxSizingProp = this.boxSizingProperty = _findBoxSizingProperty() || 'box-sizing';
					boxSizingValue = this.boxSizingValue = this.$elem.css(boxSizingProp) || 'content-box';
				}
				
				// return it immediately if we already know it
				if (this[funcName] && this[dim] == outerLen) {
					return this[funcName];
				} else {
					this[dim] = outerLen;
				}
				
				// add in the padding and border
				if (boxSizingProp && (boxSizingValue == 'padding-box' || boxSizingValue == 'content-box')) {
					outerLen += parseFloat($.curCSS(elem, 'padding-' + side[dim][0], true)) || 0 +
								  parseFloat($.curCSS(elem, 'padding-' + side[dim][1], true)) || 0;
				}
				if (boxSizingProp && boxSizingValue == 'content-box') {
					outerLen += parseFloat($.curCSS(elem, 'border-' + side[dim][0] + '-width', true)) || 0 +
								  parseFloat($.curCSS(elem, 'border-' + side[dim][1] + '-width', true)) || 0;
				}
				
				// remember and return the outerHeight
				this[funcName] = outerLen;
				return outerLen;
			}
			return this.$elem[funcName]();
		}
	});
	
	/**
	 * Determine the correct property for checking the box-sizing property
	 * @param void
	 * @return string
	 */
	var _boxSizingProperty = null;
	function _findBoxSizingProperty () {
		if (_boxSizingProperty) {
			return _boxSizingProperty;
		} 
		
		var property = {
				boxSizing : 'box-sizing',
				MozBoxSizing : '-moz-box-sizing',
				WebkitBoxSizing : '-webkit-box-sizing',
				OBoxSizing : '-o-box-sizing'
			},
			elem = document.body;
		
		for (var p in property) {
			if (typeof elem.style[p] != 'undefined') {
				_boxSizingProperty = property[p];
				return _boxSizingProperty;
			}
		}
		return null;
	}
})(jQuery, this, this.document);


///////////////////////////////////////////////////////
// Attr
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	var rfuncvalue = /([\w\-]*?)\((.*?)\)/g, // with values
		attr = 'data-transform',
		rspace = /\s/,
		rcspace = /,\s/;
	
	$.extend($.transform.prototype, {		
		/**
		 * This overrides all of the attributes
		 * @param Object funcs a list of transform functions to store on this element
		 * @return void
		 */
		setAttrs: function(funcs) {
			var string = '',
				value;
			for (var func in funcs) {
				value = funcs[func];
				if ($.isArray(value)) {
					value = value.join(', ');
				}
				string += ' ' + func + '(' + value + ')'; 
			}
			this.attr = $.trim(string);
			this.$elem.attr(attr, this.attr);
		},
		
		/**
		 * This sets only a specific atribute
		 * @param string func name of a transform function
		 * @param mixed value with proper units
		 * @return void
		 */
		setAttr: function(func, value) {
			// stringify the value
			if ($.isArray(value)) {
				value = value.join(', ');
			}
			value = $.trim(value+'');
			
			// pull from a local variable to look it up
			var transform = this.attr || this.$elem.attr(attr);
			
			if (!transform || transform.indexOf(func) > -1) {
				// We don't have any existing values, save it
				// we don't have this function yet, save it
				this.attr = $.trim(transform + ' ' + func + '(' + value + ')');
				this.$elem.attr(attr, this.attr);
			} else {
				// replace the existing value
				var funcs = [],	parts;
				
				// regex split
				rfuncvalue.lastIndex = 0; // reset the regex pointer
				while ((result = rfuncvalue.exec(transform)) !== null) {
					if (func == parts[1]) {
						funcs.push(func + '(' + value + ')');
					} else {
						funcs.push(parts[0]);
					}
				}
				this.attr = funcs.join(' ');
				this.$elem.attr(attr, this.attr);
			}
		},
		
		/**
		 * @return Object
		 */
		getAttrs: function() {
			var transform = this.attr || this.$elem.attr(attr);
			if (!transform) {
				// We don't have any existing values, return empty object
				return {};
			}
			
			// replace the existing value
			var attrs = {}, parts, value;
			
			rfuncvalue.lastIndex = 0; // reset the regex pointer
			while ((parts = rfuncvalue.exec(transform)) !== null) {
				if (parts) {
					value = parts[2].split(rcspace);
					attrs[parts[1]] = value.length == 1 ? value[0] : value;
				}
			}
			return attrs;
		},
		
		/**
		 * @param String func 
		 * @return mixed
		 */
		getAttr: function(func) {
			var attrs = this.getAttrs();
			
			if (typeof attrs[func] !== 'undefined') {
				return attrs[func];
			}
			
			// animate needs sensible defaults for some props
			switch (func) {
				case 'scale': return [1, 1];
				case 'scaleX': // no break;
				case 'scaleY': return 1;
				case 'matrix': return [1, 0, 0, 1, 0, 0];
				case 'origin':
					if ($.support.csstransforms) {
						// supported browsers return percentages always
						return this.$elem.css(this.transformOriginProperty).split(rspace);
					} else {
						// just force IE to also return a percentage
						return ['50%', '50%'];
					}
			}
			return null;
		}
	});
})(jQuery, this, this.document);
///////////////////////////////////////////////////////
// Animation
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	// Extend the jQuery animation to handle transform functions
	/**
	 * @var Regex looks for units on a string
	 */
	var rfxnum = /^([+\-]=)?([\d+.\-]+)(.*)$/;
	
	/**
	 * @var Regex identify if additional values are hidden in the unit 
	 */
	var rfxmultinum = /^(.*?)\s+([+\-]=)?([\d+.\-]+)(.*)$/;
	
	/**
	 * Doctors prop values in the event that they contain spaces
	 * @param Object prop
	 * @param String speed
	 * @param String easing
	 * @param Function callback
	 * @return bool
	 */
	var _animate = $.fn.animate;
	$.fn.animate = function( prop, speed, easing, callback ) {
		//NOTE: The $.fn.animate() function is a big jerk and requires
		//		you to attempt to convert the values passed into pixels.
		//		So we have to doctor the values passed in here to make
		//		sure $.fn.animate() won't think there's units an ruin
		//		our fun.
		if (prop && !jQuery.isEmptyObject(prop)) {
			var $elem = this;
			jQuery.each( prop, function( name, val ) {
				// Clean up the numbers for space-sperated prop values
				if ($.inArray(name, $.transform.funcs) != -1) {
					// allow for reflection animation
					if ($.transform.rfunc.reflect.test(name)) {
						var m = val ? $.matrix[name]() : $.matrix.identity(), 
							e = m.elements;
						val = [e[0], e[1], e[2], e[3]]; 
					}
				
					var parts = rfxnum.exec(val);
					
					if ((parts && parts[3]) || $.isArray(val)) {
						// Either a unit was found or an array was passed
						var end, unit, values = [];
						
						if ($.isArray(val)) {
							// An array was passed
							$.each(val, function(i) {
								parts = rfxnum.exec(this);
								end = parseFloat(parts[2]);
								unit = parts[3] || "px";
										
								// Remember value
								values.push({
									end: (parts[1] ? parts[1] : '') + end,
									unit: unit
								});
							});
						} else {
							// A unit was found
							end = parseFloat( parts[2] );
							unit = parts[3] || "px";
								
							// Remember the first value
							values.push({
								end: (parts[1] ? parts[1] : '') + end,
								unit: unit
							});
							
							// Detect additional values hidden in the unit
							var i = 0;
							while (parts = rfxmultinum.exec(unit)) {
								// Fix the previous unit
								values[i].unit = parts[1];
								
								// Remember this value
								values.push({
									end: (parts[2] ? parts[2] : '') + parseFloat(parts[3]),
									unit: parts[4]
								});
								unit = parts[4];
								i++;
							}
						}
					
						// Save the values and truncate the value to make it safe to animate
						$elem.data('data-animate-' + name, values);
						prop[name] = values[0].end; // NOTE: this propegates into the arguments object
					}
				}
			});
		}
		//NOTE: we edit prop above
		return _animate.apply(this, arguments);
	};
	
	/**
	 * Returns appropriate start value for transform props
	 * @param Boolean force
	 * @return Number
	 */
	var _cur = $.fx.prototype.cur;
	$.fx.prototype.cur = function(force) {
		//NOTE: The cur function tries to look things up on the element
		//		itself as a native property first instead of as a style
		//		property. However, the animate function is a big jerk
		//		and it's extremely easy to poison the element.style 
		//		with a random property and ruin all of the fun. So, it's
		//		easier to just look it up ourselves.
		if ($.inArray(this.prop, $.transform.funcs) != -1) {
			this.transform = this.transform || this.elem.transform || new $.transform(this.elem);
			var r = $.transform.rfunc;
			
			// return a single unitless number and animation will play nice
			var value = this.transform.getAttr(this.prop),
				parts = rfxnum.exec($.isArray(value) ? value[0] : value);
			if (value === null || parts === null) {
				value = r.scale.test(this.prop) || r.reflect.test(this.prop)  ? 1 : 0;
				parts = [null, null, value];
			}
			return parseFloat(parts[2]);
		}
		return _cur.apply(this, arguments);
	};
	
	/**
	 * Detects the existence of a space separated value
	 * @param Object fx
	 * @return null
	 */
	$.fx.multivalueInit = function(fx) {
		var $elem = $(fx.elem),
			values = fx.transform.getAttr(fx.prop), // existing values
			initValues = $elem.data('data-animate-' + fx.prop); // new values passed into animate
		
		if (initValues) {
			$elem.removeData('data-animate-' + fx.prop); // unremember the saved property
		}
		
		if ($.transform.rfunc.reflect.test(fx.prop)) {
			values = fx.transform.getAttr('matrix');
		}
		
		fx.values = [];
		
		// If we found a previous array but we're only setting one value, we need to set both
		if ($.isArray(values) && !$.isArray(initValues)) {
			initValues = [
				{
					end: parseFloat(fx.end),
					unit: fx.unit
				},
				{
					end: $.transform.rfunc.scale.test(fx.prop) ? 1 : 0,
					unit: fx.unit
				}
			];
		}
		
		// If we altered the values before
		// This happens in the doctored animate function when we pass a unit or multiple values
		if (initValues) {
			var start,
				rscalefunc = $.transform.rfunc.scale,
				parts;
			$.each(initValues, function(i, val) {
				// pull out the start value
				if ($.isArray(values)) {
					start = values[i];
				} else if (i > 0) {
					// scale duplicates the values for x and y
					start = rscalefunc.test(fx.prop) ? values : null;
				} else {
					start = values;
				}
				
				// if we didn't find a start value
				if (!start && start !== 0) {
					start = rscalefunc.test(fx.prop) ? 1 : 0;
				}
				
				// ensure a number
				start = parseFloat(start);
				
				// handle the existence of += and -= prefixes
				parts = rfxnum.exec(val.end);
				if (parts && parts[1]) {
					val.end = ((parts[1] === "-=" ? -1 : 1) * parseFloat(parts[2])) + start;
				}
				
				// Save the values
				fx.values.push({
					start: parseFloat(start),
					end: parseFloat(val.end),
					unit: val.unit
				});
			});
		} else {
			// Save the known value
			fx.values.push({
				start: parseFloat(fx.start),
				end: parseFloat(fx.end), // force a Number
				unit: fx.unit
			});
		}
	};

	/**
	 * Animates a multi value attribute
	 * @param Object fx
	 * @return null
	 */
	$.fx.multivalueStep = {
		_default: function(fx) {
			$.each(fx.values, function(i, val) {
				fx.values[i].now = val.start + ((val.end - val.start) * fx.pos);
			});
		}
	};
	
	/**
	 * Step for animating tranformations
	 */
	$.each($.transform.funcs, function(i, func) {
		$.fx.step[func] = function(fx) {
			// Initialize the transformation
			if (!fx.transformInit) {
				fx.transform = fx.transform || fx.elem.transform || new $.transform(fx.elem);
								
				// Handle multiple values
				$.fx.multivalueInit(fx);
				if (fx.values.length > 1) {
					fx.multiple = true;
				}
				
				// Force degrees for angles, Remove units for unitless
				var r = $.transform.rfunc;
				if (r.angle.test(fx.prop)) {
					//TODO: we should convert from other rational units
					fx.unit = 'deg';
				} else if (r.scale.test(fx.prop)) {
					fx.unit = ''; 
				} else if (r.reflect.test(fx.prop)) {
					//TODO: for animation purposes, this is a matrix and can be animated (although it looks silly)
					fx.unit = ''; //this is a boolean func
				} else if (fx.prop == 'matrix') {
					fx.unit = '';
				}
				//TODO: I guess we already foced length units earlier
				
				// Force all units on multiple values to be the same
				//TODO: we should convert from other rational units
				$.each(fx.values, function(i) {fx.values[i].unit = fx.unit;});
				
				fx.transformInit = true;
			}
			
			
			// Increment all of the values
			if (fx.multiple) {
				($.fx.multivalueStep[fx.prop] || $.fx.multivalueStep._default)(fx);
			} else {
				fx.values[0].now = fx.now;
			}
			
			var values = [];
			
			// Do some value correction and join the values
			$.each(fx.values, function(i, value) {
				// Keep angles below 360 in either direction.
				if (value.unit == 'deg') {
					while (value.now >= 360 ) {
						value.now -= 360;
					}
					while (value.now <= -360 ) {
						value.now += 360;
					}
				}
				// TODO: handle reflection matrices here
				
				//Pretty up the final value (use the double parseFloat
				//	to correct super small decimals)
				values.push(parseFloat(parseFloat(value.now).toFixed(8)) + value.unit);
			});
			
			// Apply the transformation
			var funcs = {},
				prop = $.transform.rfunc.reflect.test(fx.prop) ? 'matrix' : fx.prop;
						
			funcs[prop] = fx.multiple ? values : values[0];
			fx.transform.exec(funcs, {preserve: true});
		};
	});
})(jQuery, this, this.document);
///////////////////////////////////////////////////////
// Angle
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	/**
	 * Converting a radian to a degree
	 * @const
	 */
	var RAD_DEG = 180/Math.PI;
	
	/**
	 * Converting a radian to a grad
	 * @const
	 */
	var RAD_GRAD = 200/Math.PI;
	
	/**
	 * Converting a degree to a radian
	 * @const
	 */
	var DEG_RAD = Math.PI/180;
	
	/**
	 * Converting a degree to a grad
	 * @const
	 */
	var DEG_GRAD = 2/1.8;
	
	/**
	 * Converting a grad to a degree
	 * @const
	 */
	var GRAD_DEG = 0.9;
	
	/**
	 * Converting a grad to a radian
	 * @const
	 */
	var GRAD_RAD = Math.PI/200;
	
	/**
	 * Functions for converting angles
	 * @var Object
	 */
	$.extend({
		angle: {
			/**
			 * available units for an angle
			 * @var Regex
			 */
			runit: /(deg|g?rad)/,
			
			/**
			 * Convert a radian into a degree
			 * @param Number rad
			 * @return Number
			 */
			radianToDegree: function(rad) {
				return rad * RAD_DEG;
			},
			
			/**
			 * Convert a radian into a degree
			 * @param Number rad
			 * @return Number
			 */
			radianToGrad: function(rad) {
				return rad * RAD_GRAD;
			},
			
			/**
			 * Convert a degree into a radian
			 * @param Number deg
			 * @return Number
			 */
			degreeToRadian: function(deg) {
				return deg * DEG_RAD;
			},
			
			/**
			 * Convert a degree into a radian
			 * @param Number deg
			 * @return Number
			 */
			degreeToGrad: function(deg) {
				return deg * DEG_GRAD;
			},
			
			/**
			 * Convert a grad into a degree
			 * @param Number grad
			 * @return Number
			 */
			gradToDegree: function(grad) {
				return grad * GRAD_DEG;
			},
			
			/**
			 * Convert a grad into a radian
			 * @param Number grad
			 * @return Number
			 */
			gradToRadian: function(grad) {
				return grad * GRAD_RAD;
			}
		}
	});
})(jQuery, this, this.document);
///////////////////////////////////////////////////////
// Matrix Calculations
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	/**
	 * Matrix object for creating matrices relevant for 2d Transformations
	 * @var Object
	 */
	if (typeof($.matrix) == 'undefined') {
		$.extend({
			matrix: {}
		});
	}
	
	$.extend( $.matrix, {
		/**
		 * Class for calculating coordinates on a matrix
		 * @param Matrix matrix
		 * @param Number outerHeight
		 * @param Number outerWidth
		 * @constructor
		 */
		calc: function(matrix, outerHeight, outerWidth) {
			/**
			 * @var Matrix
			 */
			this.matrix = matrix;
			
			/**
			 * @var Number
			 */
			this.outerHeight = outerHeight;
			
			/**
			 * @var Number
			 */
			this.outerWidth = outerWidth;
		}
	});
	
	$.matrix.calc.prototype = {
		/**
		 * Calculate a coord on the new object
		 * @return Object
		 */
		coord: function(x, y, z) {
			//default z and w
			z = typeof(z) !== 'undefined' ? z : 0;
			
			var matrix = this.matrix,
				vector;
				
			switch (matrix.rows) {
				case 2:
					vector = matrix.x(new $.matrix.V2(x, y));
					break;
				case 3:
					vector = matrix.x(new $.matrix.V3(x, y, z));
					break;
			}
			
			return vector;
		},
		
		/**
		 * Calculate the corners of the new object
		 * @return Object
		 */
		corners: function(x, y) {
			// Try to save the corners if this is called a lot
			var save = !(typeof(x) !=='undefined' || typeof(y) !=='undefined'),
				c;
			if (!this.c || !save) {
				y = y || this.outerHeight;
				x = x || this.outerWidth;
				
				c = {
					tl: this.coord(0, 0),
					bl: this.coord(0, y),
					tr: this.coord(x, 0),
					br: this.coord(x, y)
				};
			} else {
				c = this.c;
			}
			
			if (save) {
				this.c = c;
			}
			return c;
		},
		
		/**
		 * Calculate the sides of the new object
		 * @return Object
		 */
		sides: function(corners) {
			// The corners of the box
			var c = corners || this.corners();
			
			return {
				top: Math.min(c.tl.e(2), c.tr.e(2), c.br.e(2), c.bl.e(2)),
				bottom: Math.max(c.tl.e(2), c.tr.e(2), c.br.e(2), c.bl.e(2)),
				left: Math.min(c.tl.e(1), c.tr.e(1), c.br.e(1), c.bl.e(1)),
				right: Math.max(c.tl.e(1), c.tr.e(1), c.br.e(1), c.bl.e(1))
			};
		},
		
		/**
		 * Calculate the offset of the new object
		 * @return Object
		 */
		offset: function(corners) {
			// The corners of the box
			var s = this.sides(corners);
			
			// return size
			return {
				height: Math.abs(s.bottom - s.top), 
				width: Math.abs(s.right - s.left)
			};
		},
		
		/**
		 * Calculate the area of the new object
		 * @return Number
		 * @link http://en.wikipedia.org/wiki/Quadrilateral#Area_of_a_convex_quadrilateral
		 */
		area: function(corners) {
			// The corners of the box
			var c = corners || this.corners();
			
			// calculate the two diagonal vectors
			var v1 = {
					x: c.tr.e(1) - c.tl.e(1) + c.br.e(1) - c.bl.e(1),
					y: c.tr.e(2) - c.tl.e(2) + c.br.e(2) - c.bl.e(2)
				},
				v2 = {
					x: c.bl.e(1) - c.tl.e(1) + c.br.e(1) - c.tr.e(1),
					y: c.bl.e(2) - c.tl.e(2) + c.br.e(2) - c.tr.e(2)
				};
				
			return 0.25 * Math.abs(v1.e(1) * v2.e(2) - v1.e(2) * v2.e(1));
		},
		
		/**
		 * Calculate the non-affinity of the new object
		 * @return Number
		 */
		nonAffinity: function() {
			// The corners of the box
			var sides = this.sides(),
				xDiff = sides.top - sides.bottom,
				yDiff = sides.left - sides.right;
			
			return parseFloat(parseFloat(Math.abs(
				(Math.pow(xDiff, 2) + Math.pow(yDiff, 2)) /
				(sides.top * sides.bottom + sides.left * sides.right)
			)).toFixed(8));
		},
		
		/**
		 * Calculate a proper top and left for IE
		 * @param Object toOrigin
		 * @param Object fromOrigin
		 * @return Object
		 */
		originOffset: function(toOrigin, fromOrigin) {
			// the origin to translate to
			toOrigin = toOrigin ? toOrigin : new $.matrix.V2(
				this.outerWidth * 0.5,
				this.outerHeight * 0.5
			);
			
			// the origin to translate from (IE has a fixed origin of 0, 0)
			fromOrigin = fromOrigin ? fromOrigin : new $.matrix.V2(
				0,
				0
			);
			
			// transform the origins
			var toCenter = this.coord(toOrigin.e(1), toOrigin.e(2));
			var fromCenter = this.coord(fromOrigin.e(1), fromOrigin.e(2));
			
			// return the offset
			return {
				top: (fromCenter.e(2) - fromOrigin.e(2)) - (toCenter.e(2) - toOrigin.e(2)),
				left: (fromCenter.e(1) - fromOrigin.e(1)) - (toCenter.e(1) - toOrigin.e(1))
			};
		}
	};
})(jQuery, this, this.document);
///////////////////////////////////////////////////////
// 2d Matrix Functions
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	/**
	 * Matrix object for creating matrices relevant for 2d Transformations
	 * @var Object
	 */
	if (typeof($.matrix) == 'undefined') {
		$.extend({
			matrix: {}
		});
	}
	
	$.extend( $.matrix, {
		/**
		 * Identity matrix
		 * @param Number size
		 * @return Matrix
		 */
		identity: function(size) {
			size = size || 2;
			var length = size * size,
				elements = new Array(length),
				mod = size + 1;
			for (var i = 0; i < length; i++) {
				elements[i] = (i % mod) === 0 ? 1 : 0;
			}
			return new $.matrix['M'+size+'x'+size](elements);
		},
		
		/**
		 * Matrix
		 * @return Matrix
		 */
		matrix: function() {
			var args = Array.prototype.slice.call(arguments);
			// arguments are in column-major order
			switch (arguments.length) {
				case 4:
					return new $.matrix.M2x2(
						args[0], args[2],
						args[1], args[3]
					);
				case 6:
					return new $.matrix.M3x3(
						args[0], args[2], args[4],
						args[1], args[3], args[5],
						0,       0,       1
					);
			}
		},
		
		/**
		 * Reflect (same as rotate(180))
		 * @return Matrix
		 */
		reflect: function() {
			return new $.matrix.M2x2(
				-1,  0,
				 0, -1
			);
		},
		
		/**
		 * Reflect across the x-axis (mirrored upside down)
		 * @return Matrix
		 */
		reflectX: function() {	
			return new $.matrix.M2x2(
				1,  0,
				0, -1
			);
		},
		
		/**
		 * Reflect by swapping x an y (same as reflectX + rotate(-90))
		 * @return Matrix
		 */
		reflectXY: function() {
			return new $.matrix.M2x2(
				0, 1,
				1, 0
			);
		},
		
		/**
		 * Reflect across the y-axis (mirrored)
		 * @return Matrix
		 */
		reflectY: function() {
			return new $.matrix.M2x2(
				-1, 0,
				 0, 1
			);
		},
		
		/**
		 * Rotates around the origin
		 * @param Number deg
		 * @return Matrix
		 * @link http://www.w3.org/TR/SVG/coords.html#RotationDefined
		 */
		rotate: function(deg) {
			//TODO: detect units
			var rad = $.angle.degreeToRadian(deg),
				costheta = Math.cos(rad),
				sintheta = Math.sin(rad);
			
			var a = costheta,
				b = sintheta,
				c = -sintheta,
				d = costheta;
				
			return new $.matrix.M2x2(
				a, c,
				b, d
			);
		
		},
		
		/**
		 * Scale
		 * @param Number sx
		 * @param Number sy
		 * @return Matrix
		 * @link http://www.w3.org/TR/SVG/coords.html#ScalingDefined
		 */
		scale: function (sx, sy) {
			sx = sx || sx === 0 ? sx : 1;
			sy = sy || sy === 0 ? sy : sx;
			
			return new $.matrix.M2x2(
				sx, 0,
				0, sy
			);
		},
		
		/**
		 * Scale on the X-axis
		 * @param Number sx
		 * @return Matrix
		 */
		scaleX: function (sx) {
			return $.matrix.scale(sx, 1);
		},
		
		/**
		 * Scale on the Y-axis
		 * @param Number sy
		 * @return Matrix
		 */
		scaleY: function (sy) {
			return $.matrix.scale(1, sy);
		},
		
		/**
		 * Skews on the X-axis and Y-axis
		 * @param Number degX
		 * @param Number degY
		 * @return Matrix
		 */
		skew: function (degX, degY) {
			degX = degX || 0;
			degY = degY || 0;
			
			//TODO: detect units
			var radX = $.angle.degreeToRadian(degX),
				radY = $.angle.degreeToRadian(degY),
				x = Math.tan(radX),
				y = Math.tan(radY);
			
			return new $.matrix.M2x2(
				1, x,
				y, 1
			);
		},
		
		/**
		 * Skews on the X-axis
		 * @param Number degX
		 * @return Matrix
		 * @link http://www.w3.org/TR/SVG/coords.html#SkewXDefined
		 */
		skewX: function (degX) {
			return $.matrix.skew(degX);
		},
		
		/**
		 * Skews on the Y-axis
		 * @param Number degY
		 * @return Matrix
		 * @link http://www.w3.org/TR/SVG/coords.html#SkewYDefined
		 */
		skewY: function (degY) {
			return $.matrix.skew(0, degY);
		},
		
		/**
		 * Translate
		 * @param Number tx
		 * @param Number ty
		 * @return Matrix
		 * @link http://www.w3.org/TR/SVG/coords.html#TranslationDefined
		 */
		translate: function (tx, ty) {
			tx = tx || 0;
			ty = ty || 0;
			
			return new $.matrix.M3x3(
				1, 0, tx,
				0, 1, ty,
				0, 0, 1
			);
		}
	});
})(jQuery, this, this.document);
/*!
 * jQuery 3d Transform v0.5.0pre
 * http://wiki.github.com/heygrady/transform3d/
 *
 * Copyright 2010, Grady Kuhnline
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 * 
 * Date: Wed Oct 6 00:38:58 2010 -0700
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
///////////////////////////////////////////////////////
// Attr
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	var rfuncvalue = /[\w-]*?\((.*?)\)/g, // with values
		attr = 'data-transform3d',
		rspace = /\s/,
		rcspace = /,\s/;
	
	$.transform3d.prototype.setAttrs = $.transform.prototype.setAttrs;
	$.transform3d.prototype.setAttr = $.transform.prototype.setAttr;
	$.transform3d.prototype.getAttrs = $.transform.prototype.getAttrs;
	
	$.extend($.transform3d.prototype, {		
		/**
		 * @param String func
		 * @return mixed
		 */
		getAttr: function(func) {
			var attrs = this.getAttrs();
			
			if (typeof attrs[func] !== 'undefined') {
				return attrs[func];
			}
			
			// animate needs sensible defaults for some props
			switch (func) {
				case 'scale': return [1, 1]; break;
				case 'scale3d': return [1, 1, 1]; break;
				case 'scaleX': // no break;
				case 'scaleY': //no break;
				case 'scaleZ': return 1; break;
				case 'matrix': return [1, 0, 0, 1, 0, 0]; break;
				case 'matrix3d': return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; break;
				case 'origin':
					// TODO: transform-origin is extended in 3d-enabled browsers
					if ($.support.csstransforms) {
						// supported browsers return percentages always
						return this.$elem.css(this.transformOriginProperty).split(rspace);
					} else {
						// just force IE to also return a percentage
						return ['50%', '50%'];
					}
			}
			return null;
		}
	});
})(jQuery, this, this.document);
///////////////////////////////////////////////////////
// Matrix
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	/**
	 * Matrix object for creating matrices relevant for 2d Transformations
	 * @var Object
	 */
	if (typeof($.matrix) == 'undefined') {
		$.extend({
			matrix: {}
		});
	}
	
	$.extend( $.matrix, {
		/**
		 * A 2-value vector
		 * @param Number x
		 * @param Number y
		 * @constructor
		 */
		V2: function(x, y){
			if ($.isArray(arguments[0])) {
				this.elements = arguments[0].slice(0, 2);
			} else {
				this.elements = [x, y];
			}
			this.length = 2;
		},
		
		/**
		 * A 2-value vector
		 * @param Number x
		 * @param Number y
		 * @param Number z
		 * @constructor
		 */
		V3: function(x, y, z){
			if ($.isArray(arguments[0])) {
				this.elements = arguments[0].slice(0, 3);
			} else {
				this.elements = [x, y, z];
			}
			this.length = 3;
		},
		
		/**
		 * A 2-value vector
		 * @param Number x
		 * @param Number y
		 * @param Number z
		 * @param Number w
		 * @constructor
		 */
		V4: function(x, y, z, w){
			if ($.isArray(arguments[0])) {
				this.elements = arguments[0].slice(0, 4);
			} else {
				this.elements = [x, y, z, w];
			}
			this.length = 4;
		},
		
		/**
		 * A 2x2 Matrix, useful for 2D-transformations without translations
		 * @param Number mn
		 * @constructor
		 */
		M2x2: function(m11, m12, m21, m22) {
			if ($.isArray(arguments[0])) {
				this.elements = arguments[0].slice(0, 4);
			} else {
				this.elements = Array.prototype.slice.call(arguments).slice(0, 4);
			}
			this.rows = 2;
			this.cols = 2;
		},
		
		/**
		 * A 3x3 Matrix, useful for 3D-transformations without translations
		 * @param Number mn
		 * @constructor
		 */
		M3x3: function(m11, m12, m13, m21, m22, m23, m31, m32, m33) {
			if ($.isArray(arguments[0])) {
				this.elements = arguments[0].slice(0, 9);
			} else {
				this.elements = Array.prototype.slice.call(arguments).slice(0, 9);
			}
			this.rows = 3;
			this.cols = 3;
		},
		
		/**
		 * A 4x4 Matrix, useful for Projections
		 * @param Number mn
		 * @constructor
		 */
		M4x4: function(m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34, m41, m42, m43, m44) {
			if ($.isArray(arguments[0])) {
				this.elements = arguments[0].slice(0, 16);
			} else {
				this.elements = Array.prototype.slice.call(arguments).slice(0, 16);
			}
			this.rows = 4;
			this.cols = 4;
		}
	});
	
	/** generic matrix prototype */
	var Matrix = {
		/**
		 * Return a specific element from the matrix
		 * @param Number row where 1 is the 0th row
		 * @param Number col where 1 is the 0th column
		 * @return Number
		 */
		e: function(row, col) {
			var rows = this.rows,
				cols = this.cols;
			
			// return 0 on nonsense rows and columns
			if (row > rows || col > rows || row < 1 || col < 1) {
				return 0;
			}
			
			return this.elements[(row - 1) * cols + col - 1];
		}
	};
	
	/** Extend all of the matrix types with the same prototype */
	$.extend($.matrix.M2x2.prototype, Matrix, {
		toM3x3: function() {
			var a = this.elements;
			return new $.matrix.M3x3(
				a[0], a[1], 0,
				a[2], a[3], 0,
				0,    0,    1
			);	
		},
		
		toM4x4: function() {
			var a = this.elements;
			return new $.matrix.M4x4(
				a[0], a[1], 0, 0,
				a[2], a[3], 0, 0,
				0,    0,    1, 0,
				0,    0,    0, 1
			);	
		},
		
		/**
		 * Multiply a 2x2 matrix by a similar matrix or a vector
		 * @param M2x2 | V2 matrix
		 * @return M2x2 | V2
		 */
		x: function(matrix) {
			var isVector = typeof(matrix.rows) === 'undefined';
			
			// Ensure the right-sized matrix
			if (!isVector && matrix.rows == 3) {
				return this.toM3x3().x(matrix);
			} else if (!isVector && matrix.rows == 4) {
				return this.toM4x4().x(matrix);
			}
			
			var a = this.elements,
				b = matrix.elements;
			
			if (isVector && b.length == 2) {
				// b is actually a vector
				return new $.matrix.V2(
					a[0] * b[0] + a[1] * b[1],
					a[2] * b[0] + a[3] * b[1]
				);
			} else if (b.length == a.length) {
				// b is a 2x2 matrix
				return new $.matrix.M2x2(
					a[0] * b[0] + a[1] * b[2],
					a[0] * b[1] + a[1] * b[3],
					
					a[2] * b[0] + a[3] * b[2],
					a[2] * b[1] + a[3] * b[3]
				);
			}
			return false; // fail
		},
		
		/**
		 * Generates an inverse of the current matrix
		 * @param void
		 * @return M2x2
		 * @link http://www.dr-lex.be/random/matrix_inv.html
		 */
		inverse: function() {
			var d = 1/this.determinant(),
				a = this.elements;
			return new $.matrix.M2x2(
				d *  a[3], d * -a[1],
				d * -a[2], d *  a[0]
			);
		},
		
		/**
		 * Calculates the determinant of the current matrix
		 * @param void
		 * @return Number
		 * @link http://www.dr-lex.be/random/matrix_inv.html
		 */
		determinant: function() {
			var a = this.elements;
			return a[0] * a[3] - a[1] * a[2];
		}
	});
	
	$.extend($.matrix.M3x3.prototype, Matrix, {
		toM4x4: function() {
			var a = this.elements;
			return new $.matrix.M4x4(
				a[0], a[1], a[2], 0,
				a[3], a[4], a[5], 0,
				a[6], a[7], a[8], 0,
				0,    0,    0,    1
			);	
		},
		
		/**
		 * Multiply a 3x3 matrix by a similar matrix or a vector
		 * @param M3x3 | V3 matrix
		 * @return M3x3 | V3
		 */
		x: function(matrix) {
			var isVector = typeof(matrix.rows) === 'undefined';
			
			// Ensure the right-sized matrix
			if (!isVector && matrix.rows < 3) {
				matrix = matrix.toM3x3();
			} else if (!isVector && matrix.rows == 4) {
				return this.toM4x4().x(matrix);
			}
			
			var a = this.elements,
				b = matrix.elements;
			
			if (isVector && b.length == 3) {
				// b is actually a vector
				return new $.matrix.V3(
					a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
					a[3] * b[0] + a[4] * b[1] + a[5] * b[2],
					a[6] * b[0] + a[7] * b[1] + a[8] * b[2]
				);
			} else if (b.length == a.length) {
				// b is a 3x3 matrix
				return new $.matrix.M3x3(
					a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
					a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
					a[0] * b[2] + a[1] * b[5] + a[2] * b[8],

					a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
					a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
					a[3] * b[2] + a[4] * b[5] + a[5] * b[8],

					a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
					a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
					a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
				);
			}
			return false; // fail
		},
		
		/**
		 * Generates an inverse of the current matrix
		 * @param void
		 * @return M3x3
		 * @link http://www.dr-lex.be/random/matrix_inv.html
		 */
		inverse: function() {
			var d = 1/this.determinant(),
				a = this.elements;
			return new $.matrix.M3x3(
				d * (  a[8] * a[4] - a[7] * a[5]),
				d * (-(a[8] * a[1] - a[7] * a[2])),
				d * (  a[5] * a[1] - a[4] * a[2]),
				
				d * (-(a[8] * a[3] - a[6] * a[5])),
				d * (  a[8] * a[0] - a[6] * a[2]),
				d * (-(a[5] * a[0] - a[3] * a[2])),
				
				d * (  a[7] * a[3] - a[6] * a[4]),
				d * (-(a[7] * a[0] - a[6] * a[1])),
				d * (  a[4] * a[0] - a[3] * a[1])
			);
		},
		
		/**
		 * Calculates the determinant of the current matrix
		 * @param void
		 * @return Number
		 * @link http://www.dr-lex.be/random/matrix_inv.html
		 */
		determinant: function() {
			var a = this.elements;
			return a[0] * (a[8] * a[4] - a[7] * a[5]) - a[3] * (a[8] * a[1] - a[7] * a[2]) + a[6] * (a[5] * a[1] - a[4] * a[2]);
		}
	});
	
	/**
	 * Convenience function for grabbing a 3x3 determinant
	 * @param [Number]
	 * @return Number
	 */
	function det() {
		return (new $.matrix.M3x3(arguments)).determinant();
	}
	
	$.extend($.matrix.M4x4.prototype, Matrix, {
		/**
		 * Multiply a 4x4 by a compatible matrix or a vector
		 * @param Matrix | Vector
		 * @return M4x4 | V4
		 */
		x: function(matrix) {
			var isVector = typeof(matrix.rows) === 'undefined';
			
			// Ensure the right-sized matrix
			if (!isVector && matrix.rows < 4) {
				matrix = matrix.toM4x4();
			}
			
			var a = this.elements,
				b = matrix.elements;
			
			//TODO: This looks really wrong
			if (isVector && b.length == 4) {
				// b is actually a vector
				return new $.matrix.V4(
					a[0]  * b[0] + a[1]  * b[1] + a[2]  * b[2]  + a[3]  * b[3],
					a[4]  * b[0] + a[5]  * b[1] + a[6]  * b[2]  + a[7]  * b[3],
					a[8]  * b[0] + a[9]  * b[1] + a[10] * b[2]  + a[11] * b[3],
					a[12] * b[0] + a[13] * b[1] + a[14] * b[2]  + a[15] * b[3]
				);
			} else if (b.length == a.length) {
				// b is a 4x4 matrix
				return new $.matrix.M4x4(
					a[0] * b[0] + a[1] * b[4] + a[2] * b[8]  + a[3] * b[12],
					a[0] * b[1] + a[1] * b[5] + a[2] * b[9]  + a[3] * b[13],
					a[0] * b[2] + a[1] * b[6] + a[2] * b[10] + a[3] * b[14],
					a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3] * b[15],
					
					a[4] * b[0] + a[5] * b[4] + a[6] * b[8]  + a[7] * b[12],
					a[4] * b[1] + a[5] * b[5] + a[6] * b[9]  + a[7] * b[13],
					a[4] * b[2] + a[5] * b[6] + a[6] * b[10] + a[7] * b[14],
					a[4] * b[3] + a[5] * b[7] + a[6] * b[11] + a[7] * b[15],
					
					a[8] * b[0] + a[9] * b[4] + a[10] * b[8]  + a[11] * b[12],
					a[8] * b[1] + a[9] * b[5] + a[10] * b[9]  + a[11] * b[13],
					a[8] * b[2] + a[9] * b[6] + a[10] * b[10] + a[11] * b[14],
					a[8] * b[3] + a[9] * b[7] + a[10] * b[11] + a[11] * b[15],
					
					a[12] * b[0] + a[13] * b[4] + a[14] * b[8]  + a[15] * b[12],
					a[12] * b[1] + a[13] * b[5] + a[14] * b[9]  + a[15] * b[13],
					a[12] * b[2] + a[13] * b[6] + a[14] * b[10] + a[15] * b[14],
					a[12] * b[3] + a[13] * b[7] + a[14] * b[11] + a[15] * b[15]
				);
			}
			return false; // fail
		},
		
		/**
		 * Generates an inverse of the current matrix
		 * @param void
		 * @return M4x4
		 */
		inverse: function() {
			var adj = this.adjoint(),  
				d = 1/this.determinant(),
				a = adj.elements;
			
			return new $.matrix.M4x4(
				d * a[0],  d * a[1],  d * a[2],  d * a[3],
				d * a[4],  d * a[5],  d * a[6],  d * a[7],
				d * a[8],  d * a[9],  d * a[10], d * a[11],
				d * a[12], d * a[13], d * a[14], d * a[15]
			);
		},
		
		/**
		 * Returns the adjoint of the current matrix
		 * Only useful for calculating the inverse
		 * @param void
		 * @return M4x4
		 */
		adjoint: function() {
			var a = this.elements;
			return new $.matrix.M4x4(
				 det(a[5], a[6], a[7], a[9], a[10], a[11], a[13], a[14], a[15]),
				-det(a[4], a[6], a[7], a[8], a[10], a[11], a[12], a[14], a[15]),
				 det(a[4], a[5], a[7], a[8], a[9], a[11], a[12], a[13], a[15]),
				-det(a[4], a[5], a[6], a[8], a[9], a[10], a[12], a[13], a[14]),
					
				-det(a[1], a[2], a[3], a[9], a[10], a[11], a[13], a[14], a[15]),
				 det(a[0], a[2], a[3], a[8], a[10], a[11], a[12], a[14], a[15]),
				-det(a[0], a[1], a[3], a[8], a[9], a[11], a[12], a[13], a[15]),
				 det(a[0], a[1], a[2], a[8], a[9], a[10], a[12], a[13], a[14]),
					
				 det(a[1], a[2], a[3], a[5], a[6], a[7], a[13], a[14], a[15]),
				-det(a[0], a[2], a[3], a[4], a[6], a[7], a[12], a[14], a[15]),
				 det(a[0], a[1], a[3], a[4], a[5], a[7], a[12], a[13], a[15]),
				-det(a[0], a[1], a[2], a[4], a[5], a[6], a[12], a[13], a[14]),
					
				-det(a[1], a[2], a[3], a[5], a[6], a[7], a[9], a[10], a[11]),
				 det(a[0], a[2], a[3], a[4], a[6], a[7], a[8], a[10], a[11]),
				-det(a[0], a[1], a[3], a[4], a[5], a[7], a[8], a[9], a[11]),
				 det(a[0], a[1], a[2], a[4], a[5], a[6], a[8], a[9], a[10])
			);
		},
		
		/**
		 * Calculates the determinant of the current matrix
		 * @param void
		 * @return Number
		 */
		determinant: function() {
			var a = this.elements,
				d1 = det(a[5], a[6], a[7], a[9], a[10], a[11], a[13], a[14], a[15]),
				d2 = det(a[4], a[6], a[7], a[8], a[10], a[11], a[12], a[14], a[15]),
				d3 = det(a[4], a[5], a[7], a[8], a[9], a[11], a[12], a[13], a[15]),
				d4 = det(a[4], a[5], a[6], a[8], a[9], a[10], a[12], a[13], a[14]);
	
			return a[0] * d1 - a[1] * d2 + a[2] * d3 - a[3] * d4;
		}
	});
	
	/** generic vector prototype */
	var Vector = {		
		/**
		 * Return a specific element from the vector
		 * @param Number i where 1 is the 0th value
		 * @return Number
		 */
		e: function(i) {
			return this.elements[i - 1];
		}
	};
	
	/** Extend all of the vector types with the same prototype */
	$.extend($.matrix.V2.prototype, Vector);
	$.extend($.matrix.V3.prototype, Vector);
	$.extend($.matrix.V4.prototype, Vector, {
		toV3: function() {
			var a = this.elements;
			return new $.matrix.V3(
				a[0] / a[3],
				a[1] / a[3],
				a[2] / a[3]
			);
		}
	});
})(jQuery, this, this.document);
///////////////////////////////////////////////////////
// Matrix 3d Calculations
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	$.matrix.calc.prototype.coord = function(x, y, z, w) {
		//default z and w
		z = typeof(z) !== 'undefined' ? z : 0;
		w = typeof(w) !== 'undefined' ? w : 1;
		
		var matrix = this.matrix,
			vector;
			
		switch (matrix.rows) {
			case 2:
				vector = matrix.x(new $.matrix.V2(x, y));
				break;
			case 3:
				vector = matrix.x(new $.matrix.V3(x, y, z));
				break;
			case 4:
				vector = matrix.x(new $.matrix.V4(x, y, z, w)).toV3();
				break;
		}
		
		return vector;
	};
})(jQuery, this, this.document);
///////////////////////////////////////////////////////
// 3d Matrix Functions
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	/**
	 * Matrix object for creating matrices relevant for 3d Transformations
	 * @var Object
	 */
	if (typeof($.matrix) == 'undefined') {
		$.extend({
			matrix: {}
		});
	}
	
	$.extend( $.matrix, {
		/**
		 * Matrix
		 * @return Matrix
		 */
		matrix3d: function() {
			var args = Array.prototype.slice.call(arguments);
			// arguments are in column-major order
			return new $.matrix.M4x4(
				args[0], args[4], args[8], args[12],
				args[1], args[5], args[9], args[13],
				args[2], args[6], args[10], args[14],
				args[3], args[7], args[11], args[15]
			);
		},
		
		/**
		 * Perspective
		 * @param Number ez depth in pixels
		 * @param Number ex translation in pixels
		 * @param Number ey translation in pixels
		 * @return Matrix
		 */
		perspective: function(ez, ex, ey) {
			if (ez < 0) {
				return;
			}
			ex = ex ? ex : 0;
			ey = ey ? ey : 0;
			
			d = -1/ez;
			
			return new $.matrix.M4x4(
				1, 0, 0, -ex,
				0, 1, 0, -ey,
				0, 0, 1, 0,
				0, 0, d, 1
			);
		},
		
		/**
		 * Reflect across the Z-axis (???)
		 * @return Matrix
		 */
		reflectZ: function() {
			return new $.matrix.M3x3(
				1, 0,  0,
				0, 1,  0,
				0, 0, -1
			);
		},
		
		/**
		 * Rotates around the X-Axis
		 * @param Number deg
		 * @return Matrix
		 */
		rotateX: function(deg) {
			//TODO: detect units
			var rad = $.angle.degreeToRadian(deg),
				costheta = Math.cos(rad),
				sintheta = Math.sin(rad);
			
			var a = costheta,
				b = sintheta,
				c = -sintheta,
				d = costheta;
				
			return new $.matrix.M3x3(
				1, 0, 0,
				0, a, c,
				0, b, d
			);
		},
		
		/**
		 * Rotates around the Y-Axis
		 * @param Number deg
		 * @return Matrix
		 */
		rotateY: function(deg) {
			//TODO: detect units
			var rad = $.angle.degreeToRadian(deg),
				costheta = Math.cos(rad),
				sintheta = Math.sin(rad);
			
			var a = costheta,
				b = sintheta,
				c = -sintheta,
				d = costheta;
				
			return new $.matrix.M3x3(
				a, 0, b,
				0, 1, 0,
				c, 0, d
			);
		
		},
		
		/**
		 * Rotates around the Z-Axis
		 * @param Number deg
		 * @return Matrix
		 */
		rotateZ: function(deg) {
			//TODO: detect units
			var rad = $.angle.degreeToRadian(deg),
				costheta = Math.cos(rad),
				sintheta = Math.sin(rad);
			
			var a = costheta,
				b = sintheta,
				c = -sintheta,
				d = costheta;
				
			return new $.matrix.M3x3(
				a, c, 0,
				b, d, 0,
				0, 0, 1
			);
		
		},
		
		/**
		 * Rotate around a vector
		 * @param Number x
		 * @param Number y
		 * @param Number z
		 * @param Number deg
		 * @return Matrix
		 */
		rotate3d: function(x, y, z, deg) {
			//TODO: detect units
			var rad = $.angle.degreeToRadian(deg),
				costheta = Math.cos(rad),
				sintheta = Math.sin(rad);
			
			var a = 1 + (1 - costheta) * (x * x - 1),
				b = z * sintheta + (1 - costheta) * x * y,
				c = -y * sintheta + (1 - costheta) * x * z,
				d = -z * sintheta + (1 - costheta) * x * y,
				e = 1 + (1 - costheta) * (y * y - 1),
				f = x * sintheta + (1 - costheta) * y * z,
				g = y * sintheta + (1 - costheta) * x * z,
				h = -x * sintheta + (1 - costheta) * y * z,
				i = 1 + (1 - costheta) * (z * z - 1);
					
			return new $.matrix.M3x3(
				a, b, c,
				d, e, f,
				g, h, i				
			);
		},
		
		/**
		 * Scale
		 * @param Number sx
		 * @param Number sy
		 * @return Matrix
		 */
		scale3d: function(sx, sy, sz) {
			sx = sx || sx === 0 ? sx : 1;
			sy = sy || sy === 0 ? sy : sx;
			sz = sz || sz === 0 ? sz : sx;
			
			return new $.matrix.M3x3(
				sx, 0, 0,
				0, sy, 0,
				0,  0, sz
			);
		},
		
		/**
		 * Scale on the X-axis
		 * @param Number sx
		 * @return Matrix
		 */
		scaleX: function(sx) {
			return $.matrix.scale3d(sx, 1, 1);
		},
		
		/**
		 * Scale on the Y-axis
		 * @param Number sy
		 * @return Matrix
		 */
		scaleY: function(sy) {
			return $.matrix.scale3d(1, sy, 1);
		},
		
		/**
		 * Scale on the Z-axis
		 * @param Number sz
		 * @return Matrix
		 */
		scaleZ: function(sz) {
			return $.matrix.scale3d(1, 1, sz);
		},
		
		/**
		 * Translates
		 * @param Number tx
		 * @param Number ty
		 * @param Number tz
		 * @return Matrix
		 */
		translate3d: function(tx, ty, tz) {
			tx = tx ? tx : 0;
			ty = ty ? ty : 0;
			tz = tz ? tz : 0;
			
			return new $.matrix.M4x4(
				1, 0, 0, tx,
				0, 1, 0, ty,
				0, 0, 1, tz,
				0, 0, 0, 1
			);
		},
		
		/**
		 * Translates on the X-Axis
		 * @param Number tx
		 * @return Matrix
		 */
		translateX: function(tx) {
			return $.matrix.translate3d(tx);
		},
		
		/**
		 * Translates on the Y-Axis
		 * @param Number ty
		 * @return Matrix
		 */
		translateY: function(ty) {
			return $.matrix.translate3d(0, ty);
		},
		
		/**
		 * Translates on the Z-Axis
		 * @param Number tz
		 * @return Matrix
		 */
		translateZ: function(tz) {
			return $.matrix.translate3d(0, 0, tz);
		}
	});
})(jQuery, this, this.document);