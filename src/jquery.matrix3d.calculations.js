
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