
///////////////////////////////////////////////////////
// Animation
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	/**
	 * Step for animating tranformations
	 */
	$.each($.transform3d.funcs, function(i, func) {
		$.fx.step[func] = function(fx) {
			var transform3d = fx.elem.transform3d || new $.transform3d(fx.elem),
				funcs = {};
			
			funcs[fx.prop] = fx.now;
			transform3d.exec(funcs, {preserve: true});
		};
	});
})(jQuery, this, this.document);