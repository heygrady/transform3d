///////////////////////////////////////////////////////
// Projective Transform
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	
	$.extend({
		projectiveTransform: function(elem) {
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
			//this.transformProperty = this.getTransformProperty();
		}
	});
	
	
	/**
	 * Create Transform as a jQuery plugin
	 * @param Object funcs
	 * @param Object options
	 */
	$.fn.projectiveTransform = function(funcs, options) {
		return this.each(function() {
			var t = this.projectiveTransform || new $.projectiveTransform(this);
			if (funcs) {
				t.exec(funcs, options);
			}
		});
	};
	
	$.projectiveTransform.prototype = {
		exec: function(funcs, options) {
			//1. create a matrix (example uses 3x3)
			//2. calculate the corners (example uses 0,0,1 thru 1, 1, 1)
			//3. divide the object into smaller pieces
				//a. take three points d1, d2, d3
				//b. calculate a region r
				//c. take the extreme points d1, d2
				//d. calculate an area
				//e. check that resulting patch (r * area) is larger than the minimum area
					//1. subdivide
			
		}
	};
})(jQuery, this, this.document);