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
			 * Remember the transform property so we don't have to keep
			 * looking it up
			 * @var string
			 */
			this.transformProperty = this.getTransformProperty();
			
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
			// determine if the CSS property is known 
			var property = this.transformProperty;
			
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
			if (property && !options.forceMatrix) {
				// CSS3 is supported
				return this.execFuncs(funcs);
			} else if ($.browser.msie || (property && options.forceMatrix)) {
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
			var property = this.transformProperty;
			
			// construct a CSS string
			for (var func in funcs) {
				// handle origin separately
				if (func == 'origin') {
					this[func].apply(this, $.isArray(funcs[func]) ? funcs[func] : [funcs[func]]);
				} else if ($.inArray(func, $.transform.funcs) != -1) {
					values.push(this.createTransformFunc(func, funcs[func]));
				}
			}
			this.$elem.css(property, values.join(' '));
			return true;
		},
		
		/**
		 * Applies all of the transformations as a matrix
		 * @param Object funcs
		 */
		execMatrix: function(funcs) {
			var matrix,
				property = this.transformProperty,
				args;
			
			// collect all the matrices
			var strip = function(i, arg) {
				args[i] = parseFloat(arg);
			};
			
			for (var func in funcs) {
				if ($.matrix[func] || func == 'matrix') {
					args = $.isArray(funcs[func]) ? funcs[func] : [funcs[func]];
					
					// strip the units
					// TODO: should probably convert the units properly instead of just stripping them
					$.each(args, strip);
					
					var m;
					if (func == 'matrix') {
						m = new $.matrix.M2x2(args[0], args[1], args[2], args[3]);
						if (args[4]) {
							this.setAttr('translateX', args[4]);
						}
						if (args[5]) {
							this.setAttr('translateY', args[5]);
						}
					} else {
						m = $.matrix[func].apply(this, args);
					}
					
					if (!matrix) {
						matrix = m;
					} else {
						matrix = matrix.x(m);
					}
				} else if (func == 'origin') {
					args = $.isArray(funcs[func]) ? funcs[func] : [funcs[func]];
					this[func].apply(this, args);
				}
			}
			
			// calculate translation
			// NOTE: Translate is additive
			var translate = this.getAttr('translate') || 0,
				translateX = this.getAttr('translateX') || 0,
				translateY = this.getAttr('translateY') || 0;
				
			if (!$.isArray(translate)) {
				translate = [translate, 0];
			}
			
			// check that we have a matrix
			if (!matrix) {
				// TODO: This will result in a filter being needlessly set in IE
				matrix = new $.matrix.M2x2(1, 0, 0, 1);
			}
			
			// pull out the relevant values
			var a = parseFloat(parseFloat(matrix.e(1,1)).toFixed(8)),
				b = parseFloat(parseFloat(matrix.e(2,1)).toFixed(8)),
				c = parseFloat(parseFloat(matrix.e(1,2)).toFixed(8)),
				d = parseFloat(parseFloat(matrix.e(2,2)).toFixed(8)),
				tx = 0,
				ty = 0;
				
			
			// only run the translate matrix if we need to
			if (translate[0] || translate[1] || translateX || translateY) {
				var	tvector = matrix.x(new $.matrix.V2(
					parseFloat(translate[0]) + parseFloat(translateX),
					parseFloat(translate[1]) + parseFloat(translateY)
				));
				tx = parseFloat(parseFloat(tvector.e(1)).toFixed(8));
				ty = parseFloat(parseFloat(tvector.e(2)).toFixed(8));
			}
			
			//apply the transform to the element
			if (property && property.substr(0, 4) == '-moz') { // -moz
				this.$elem.css(property, 'matrix(' + a + ', ' + b + ', ' + c + ', ' + d + ', ' + tx + 'px, ' + ty + 'px)');
			} else if (property) { // -webkit, -o, w3c
				// NOTE: WebKit and Opera don't allow units on the translate variables
				this.$elem.css(property, 'matrix(' + a + ', ' + b + ', ' + c + ', ' + d + ', ' + tx + ', ' + ty + ')');
			} else if (jQuery.browser.msie) { // IE
				// IE requires the special transform Filter
				var style = this.$elem[0].style;
				var matrixFilter = 'progid:DXImageTransform.Microsoft.Matrix(M11=' + a + ', M12=' + c + ', M21=' + b + ', M22=' + d + ', sizingMethod=\'auto expand\')';
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
			var property = this.transformProperty,
				height = this.safeOuterHeight(),
				width = this.safeOuterWidth();
				
			// correct for word lengths
			switch (x) {
				case 'left': x = '0'; break;
				case 'right': x = width; break;
				case 'center': x = width * 0.5; break;
			}
			switch (y) {
				case 'top': y = '0'; break;
				case 'bottom': y = height; break;
				case 'center': // no break
				case undefined: y = height * 0.5; break;
			}
	
			// assume all length units are px
			//TODO: handle unit conversion better
			x = /%/.test(x) ? width * parseFloat(x) /100 : parseFloat(x);
			if (typeof(y) !== 'undefined') {
				y = /%/.test(y) ? height * parseFloat(y) /100 : parseFloat(y);
			}
			
			// Apply the property
			if (property) { //Moz, WebKit, Opera
				if (!y && y !== 0) {
					this.$elem.css(property + '-origin', x + 'px');
				} else {
					this.$elem.css(property + '-origin', x + 'px ' + y + 'px');
				}
			}
			
			// remember the transform origin
			// TODO: setting in px isn't an entirely accurate way to do this
			if (!y && y !== 0) {
				this.setAttr('origin', x);
			} else {
				this.setAttr('origin', [x, y]);
			}
			return true;
		},
		
		/**
		 * Try to determine which browser we're in by the existence of a
		 * custom transform property
		 * @param void
		 * @return String
		 */
		getTransformProperty: function() {
			if (this.transformProperty) {
				return this.transformProperty;
			}
			var elem = document.body;
			var property = {
				transform : 'transform',
				MozTransform : '-moz-transform',
				WebkitTransform : '-webkit-transform',
				OTransform : '-o-transform'
			};
			for (var p in property) {
				if (typeof elem.style[p] != 'undefined') {
					 this.transformProperty = property[p];
					return property[p];
				}
			}
			// Default to transform also
			return null;
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
			var offset = calc.originOffset({
				x: parseFloat(origin[0]),
				y: parseFloat(origin[1])
			});
			
			// IE glues the top-most and left-most pixels of the transformed object to top/left of the original object
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
						ratio = calc.size(),
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
			value = $.trim(value);
			
			var transform = this.attr || this.$elem.attr(attr);
			if (!transform) {
				// We don't have any existing values, save it
				this.attr = value;
				this.$elem.attr(attr, this.attr);
			} else if (transform.indexOf(func) > -1) {
				// we don't have this function yet, save it
				this.attr = transform + ' ' + value;
				this.$elem.attr(attr, this.attr);
			}
			
			// replace the existing value
			var values = [],
				result, parts;
				
			rfuncvalue.exec(''); // hacky, reset the regex pointer
			while ((result = rfuncvalue.exec(transform)) !== null) {
				values.push(result[0]); 
			}
			
			for (var i = 0, l = values.length; i < l; i++) {
				rfuncvalue.exec(''); // hacky, reset the regex pointer
				parts = rfuncvalue.exec(values[i]);
				
				if (func == parts[1]) {
					values[i] = value;
					break;
				}
			}
			this.attr = values.join(' ');
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
			
			rfuncvalue.exec(''); // hacky, reset the regex pointer
			while ((result = rfuncvalue.exec(transform)) !== null) {
				values.push(result[0]); 
			}
			
			for (var i = 0, l = values.length; i < l; i++) {
				rfuncvalue.exec(''); // hacky, reset the regex pointer
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
			rfuncvalue.exec(''); // hacky, reset the regex pointer
			while ((result = rfuncvalue.exec(transform)) !== null) {
				values.push(result[0]); 
			}
			
			for (var i = 0, l = values.length; i < l; i++) {
				rfuncvalue.exec(''); // hacky, reset the regex pointer
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