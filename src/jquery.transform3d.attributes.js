
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