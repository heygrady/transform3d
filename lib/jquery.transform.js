/*!
 * jQuery 2d Transform
 * http://wiki.github.com/heygrady/transform/
 *
 * Copyright 2010, Grady Kuhnline
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
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
		m_style = m.style,
		docElement = document.documentElement;
		
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
					
					tempMatrix = $.matrix[func].apply(this, args);
					matrix = matrix ? matrix.x(tempMatrix) : tempMatrix;
				} else if (func == 'origin') {
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
			
			// fake it in IE
			var height = this.safeOuterHeight(),
				width = this.safeOuterWidth();
				
			// correct for word lengths
			switch (x) {
				case 'left': x = '0'; break;
				case 'right': x = width; break;
				case 'center': // no break
				case undefined: x = width * 0.5;
			}
			switch (y) {
				case 'top': y = '0'; break;
				case 'bottom': y = height; break;
				case 'center': // no break
				case undefined: y = height * 0.5;
			}
	
			// assume all length units are px
			//TODO: handle unit conversion better
			x = /%/.test(x) ? width * parseFloat(x) / 100 : parseFloat(x);
			if (typeof y !== 'undefined') {
				y = /%/.test(y) ? height * parseFloat(y) / 100 : parseFloat(y);
			}
			
			// remember the transform origin
			// TODO: setting in px isn't an entirely accurate way to do this
			if (typeof y === 'undefined') {
				this.setAttr('origin', x);
			} else {
				this.setAttr('origin', [x, y]);
			}
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
				origin = this.getAttr('origin');
				
			// translate a 0, 0 origin to the current origin
			var offset = calc.originOffset(new $.matrix.V2(
				parseFloat(origin[0]),
				parseFloat(origin[1])
			));
			
			// IE glues the top-most and left-most pixels of the transformed object to top/left of the original object
			//TODO: This seems wrong in the calculations
			var sides = calc.sides(),
				size = calc.offset();

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
	var rfuncvalue = /(origin|matrix|reflect(X|XY|Y)?|rotate|scale[XY]?|skew[XY]?|translate[XY]?)\((.*?)\)/g, // with values
		rfuncname = /^origin|matrix|reflect(XY|[XY])?|rotate|scale[XY]?|skew[XY]?|translate[XY]?$/, // just funcname
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
				if (rfuncname.test(func)) {
					value = funcs[func];
					if ($.isArray(value)) {
						value = value.join(', ');
					}
					string += ' ' + func + '(' + value + ')'; 
				}
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
			// not a valid function
			if (!rfuncname.test(func)) {
				return;
			}
			
			// stringify the value
			if ($.isArray(value)) {
				value = value.join(', ');
			}
			value = $.trim(value+'');
			var transform = this.attr || this.$elem.attr(attr);
			if (!transform) {
				// We don't have any existing values, save it
				this.attr = func + '(' + value + ')';
				this.$elem.attr(attr, this.attr);
			} else if (transform.indexOf(func) > -1) {
				// we don't have this function yet, save it
				this.attr = transform + ' ' + func + '(' + value + ')';
				this.$elem.attr(attr, this.attr);
			}
			
			// replace the existing value
			var funcs = [],
				result, parts;
			
			// regex split
			rfuncvalue.lastIndex = 0; // reset the regex pointer
			while ((result = rfuncvalue.exec(transform)) !== null) {
				funcs.push(result[0]); 
			}
			
			// loop the funcs to find the matching one
			for (var i = 0, l = funcs.length; i < l; i++) {
				rfuncvalue.lastIndex = 0; // reset the regex pointer
				parts = rfuncvalue.exec(funcs[i]);
				
				if (func == parts[1]) {
					funcs[i] = func + '(' + value + ')';
					break;
				}
			}
			this.attr = funcs.join(' ');
			this.$elem.attr(attr, this.attr);
		},
		
		/**
		 * @return Object values with proper units
		 */
		getAttrs: function() {
			var transform = this.attr || this.$elem.attr(attr);
			if (!transform) {
				// We don't have any existing values, return empty object
				return {};
			}
			
			// replace the existing value
			var values = [],
				attrs = {},
				result, parts, value;
			
			rfuncvalue.lastIndex = 0; // reset the regex pointer
			while ((result = rfuncvalue.exec(transform)) !== null) {
				values.push(result[0]); 
			}
			
			for (var i = 0, l = values.length; i < l; i++) {
				rfuncvalue.lastIndex = 0; // reset the regex pointer
				parts = rfuncvalue.exec(values[i]);
				
				if (parts && rfuncname.test(parts[1])) {
					value = parts[3].split(rcspace);
					attrs[parts[1]] = value.length == 1 ? value[0] : value;
				}
			}
			return attrs;
		},
		
		/**
		 * @param String func 
		 * @param Bool split splits space separated values into an array
		 * @return value with proper units
		 */
		getAttr: function(func) {
			// not a valid function
			if (!rfuncname.test(func)) {
				return null;
			}
			
			var transform = this.attr || this.$elem.attr(attr);
			var rscalefunc = $.transform.rfunc.scale;
			if (func != 'origin' && func != 'matrix' && (!transform || transform.indexOf(func) === -1)) {
				// We don't have any existing values, return null
				return rscalefunc.test(func) ? 1 : null;
			}
			
			// return the existing value
			var values = [],
				result, parts, value = null;
			rfuncvalue.lastIndex = 0; // reset the regex pointer
			while ((result = rfuncvalue.exec(transform)) !== null) {
				values.push(result[0]); 
			}
			
			for (var i = 0, l = values.length; i < l; i++) {
				rfuncvalue.lastIndex = 0; // reset the regex pointer
				parts = rfuncvalue.exec(values[i]);
				
				if (func == parts[1]) {
					value = parts[3].split(rcspace);
					return value.length == 1 ? value[0] : value;
				}
			}
			
			// maybe look it up?
			//NOTE: Moz and WebKit always return the value of transform
			//	as a matrix and obscures the individual functions. So
			//	it's impossible to know what was set in the CSS.
			if (func == 'origin') {
				var rperc = /%/;
				
				// we can look up the origin in CSS
				value = this.transformProperty ?
					this.$elem.css(this.transformProperty + '-origin') :
					[this.safeOuterWidth() * 0.5, this.safeOuterHeight() * 0.5]; // for IE
				value = $.isArray(value) ? value : value.split(rspace);
				
				//Moz reports the value in % if there hasn't been a transformation yet
				if (rperc.test(value[0])) {
					if (rperc.test(value[0])) {
						value[0] = this.safeOuterWidth() * (parseFloat(value[0])/100);
					}
					if (rperc.test(value[1])) {
						value[1] = this.safeOuterHeight() * (parseFloat(value[1])/100);
					}
				}
			} else if (func == 'matrix') {
				value = [1, 0, 0, 1, 0, 0];
			} else if (rscalefunc.test(func)) {
				// force scale to be 1
				value = 1;
			}
			
			return $.isArray(value) && value.length == 1 ? value[0] : value;
		}
	});
})(jQuery, this, this.document);