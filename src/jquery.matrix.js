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