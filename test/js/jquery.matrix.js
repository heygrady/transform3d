///////////////////////////////////////////////////////
// Transform Matrix
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
		 * Perspective
		 * @param Number d depth in pixels
		 * @return Matrix
		 */
		perspective: function(d) {
			if (d < 0) {
				return;
			}
			
			d = -1/d;
			
			return new $.matrix.M4x4(
				1, 0, 0, 0,
				0, 1, 0, 0,
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
			)
		
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
				h = -x * sintheta + (1 - costheta) * y * z
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
			var z = (typeof(sz) != 'undefined');
			sx = sx || sx === 0 ? sx : 1;
			sy = sy || sy === 0 ? sy : sx;
			sz = sz || sz === 0 ? sz : sx;
			
			if (!z) {
				return new $.matrix.M2x2(
					sx, 0,
					0, sy
				);	
			} else {
				return new $.matrix.M3x3(
					sx, 0, 0,
					0, sy, 0,
					0,  0, sz
				);
			}
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
			var z = (typeof(tz) != 'undefined');
			tx = tx || tx === 0 ? tx : 0;
			ty = ty || ty === 0 ? ty : 0;
			tz = tz || tz === 0 ? tz : 0;
			
			
			if (!z) {
				return new $.matrix.M3x3(
					1, 0, tx,
					0, 1, ty,
					0, 0, 1
				);	
			} else {
				return new $.matrix.M4x4(
					1, 0, 0, tx,
					0, 1, 0, ty,
					0, 0, 1, tz,
					0, 0, 0, 1
				);
			}
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
				this.elements = [m11,  m12,  m21,  m22];
			}
			this.rows = 2;
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
				this.elements = [m11,  m12,  m13,  m21,  m22,  m23,  m31,  m32,  m33];
			}
			this.rows = 3;
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
				this.elements = [m11,  m12,  m13,  m14,  m21,  m22,  m23,  m24,  m31,  m32,  m33,   m34,   m41,   m42,   m43,   m44];
			}
			this.rows = 4;
		},
		
		/**
		 * Generates an array suitable for creating an empty matrix
		 * @param Number length where length is rows x cols
		 */
		I: function(length) {
			var elements = new Array(length);
			for (var i = 0; i < length; i++) {
				elements[i] = !(i % (Math.sqrt(length) + 1)) ? 1 : 0;
			}
			return elements;
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
				cols = this.elements.length / rows;
			
			// return 0 on nonsense rows and columns
			if (row > rows || col > rows || row < 1 || col < 1) {
				return 0;
			}
			
			return this.elements[((row - 1) * cols) + col - 1];
		},
		
		augment: function(elements) {
			var a = elements || this.elements;
			var b = this.elements.slice();
			var	bcols = this.rows; // it's a square array
			
			var c = new Array(a.length + b.length);
				
			var rows = this.rows, // assume b has same rows as a
				row = 0, // row
				cols = c.length / rows,
				acols = a.length / this.rows, // new columns
				col; // col
				
			do {
				col = 0;
				do {
					c[(row * cols) + col + acols] = a[(row * acols) + col];
					c[(row * cols) + col] = b[(row * bcols) + col];
					col++;
				} while (col < acols);
				row++;
			} while (row < rows);
			return c;
		}
	};
	
	/** Extend all of the matrix types with the same prototype */
	$.extend($.matrix.M2x2.prototype, Matrix, {
		toM3x3: function() {
			return new $.matrix.M4x4(
				this.e(1, 1), this.e(1, 2), 0,
				this.e(2, 1), this.e(2, 2), 0,
				0,            0,            1
			);	
		},
		
		/**
		 * Multiply a 2x2 matrix by a similar matrix or a vector
		 * @param M2x2 | V2 matrix
		 * @return M2x2 | V2
		 */
		x: function(matrix) {
			var a = this.elements,
				b = matrix.elements,
				isVector = typeof(matrix.rows) === 'undefined',
				rows =  !isVector ? matrix.rows : b.length, //b rows
				cols = a.length / this.rows;
			
			if (isVector) {
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
			return false; //We don't know how to handle any other types of matrices
		},
		
		/**
		 * Generates an inverse of the current matrix
		 * @param void
		 * @return M2x2
		 * @link http://www.dr-lex.be/random/matrix_inv.html
		 */
		inverse: function() {
			var det = 1/this.det();
			return new $.matrix.M2x2(
				det *  this.e(2, 2), det * -this.e(1, 2),
				det * -this.e(2, 1), det *  this.e(1, 1)
			);
		},
		
		/**
		 * Calculates the determinant of the current matrix
		 * @param void
		 * @return Number
		 * @link http://www.dr-lex.be/random/matrix_inv.html
		 */
		det: function() {
			return this.e(1, 1) * this.e(2, 2) - this.e(1, 2) * this.e(2, 1);
		}
	});
	
	$.extend($.matrix.M3x3.prototype, Matrix, {
		toM4x4: function() {
			return new $.matrix.M4x4(
				this.e(1, 1), this.e(1, 2), this.e(1, 3), 0,
				this.e(2, 1), this.e(2, 2), this.e(2, 3), 0,
				this.e(3, 1), this.e(3, 2), this.e(3, 3), 0,
				0,            0,            0,            1
			);	
		},
		
		/**
		 * Multiply a 3x3 matrix by a similar matrix or a vector
		 * @param M3x3 | V3 matrix
		 * @return M3x3 | V3
		 */
		x: function(matrix) {
			var a = this.elements,
				b = matrix.elements,
				isVector = typeof(matrix.rows) === 'undefined',
				rows =  !isVector ? matrix.rows : b.length, //b rows
				cols = a.length / this.rows;
			
			if (isVector) {
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
			return false; //We don't know how to handle any other types of matrices
		},
		
		/**
		 * Generates an inverse of the current matrix
		 * @param void
		 * @return M3x3
		 * @link http://www.dr-lex.be/random/matrix_inv.html
		 */
		inverse: function() {
			var det = 1/this.det();
			return new $.matrix.M3x3(
				det * (  this.e(3, 3) * this.e(2, 2)  - this.e(3, 2) * this.e(2, 3)),
				det * (-(this.e(3, 3) * this.e(1, 2)  - this.e(3, 2) * this.e(1, 3))),
				det * (  this.e(2, 3) * this.e(1, 2)  - this.e(2, 2) * this.e(1, 3)),
				det * (-(this.e(3, 3) * this.e(2, 1)  - this.e(3, 1) * this.e(2, 3))),
				det * (  this.e(3, 3) * this.e(1, 1)  - this.e(3, 1) * this.e(1, 3)),
				det * (-(this.e(2, 3) * this.e(1, 1)  - this.e(2, 1) * this.e(1, 3))),
				det * (  this.e(3, 2) * this.e(2, 1)  - this.e(3, 1) * this.e(2, 2)),
				det * (-(this.e(3, 2) * this.e(1, 1)  - this.e(3, 1) * this.e(1, 2))),
				det * (  this.e(2, 2) * this.e(1, 1)  - this.e(2, 1) * this.e(1, 2))
			);
		},
		
		/**
		 * Calculates the determinant of the current matrix
		 * @param void
		 * @return Number
		 * @link http://www.dr-lex.be/random/matrix_inv.html
		 */
		det: function() {
			return this.e(1, 1) * (this.e(3, 3) * this.e(2, 2) - this.e(3, 2) * this.e(2, 3)) - this.e(2, 1) * (this.e(3, 3) * this.e(1, 2) - this.e(3, 2) * this.e(1, 3)) + this.e(3, 1) * (this.e(2, 3) * this.e(1, 2) - this.e(2, 2) * this.e(1, 3));
		}
	});
	
	$.extend($.matrix.M4x4.prototype, Matrix, {
		/**
		 * Multiply a 4x4 by a compatible matrix or a vector
		 * @param Matrix | Vector
		 * @return M4x4 | V4
		 */
		x: function(matrix) {
			// Ensure the right-sized matrix
			if (matrix.rows == 3) {
				matrix = matrix.toM4x4();
			}
			
			var a = this.elements.slice(),
				b = matrix.elements,
				isVector = typeof(matrix.rows) === 'undefined',
				rows =  !isVector ? matrix.rows : b.length, //b rows
				cols = a.length / this.rows;
			
			// b must be a similar matrix or a vector
			if (rows !== this.rows) {
				return false;
			}
			
			var elements = new Array(b.length),
				bcols = b.length / rows,
				row = 0,
				col,
				i,
				sum;
			
			
			// loop all rows in b
			do {
				col = 0;
				
				// loop all cols in b
				do {
					i = 0;
					sum = 0;
					
					// loop all columns in a;
					do {	
						sum += a[(row * cols) + i] * b[(i * bcols) + col];
						i++;
					} while (i < cols)
					
					// assign the sum to the correct row/column
					elements[(row * bcols) + col] = sum;
					col++;
				} while(col < bcols)
				row++;
			} while (row < rows)
			
			// return a matrix or a vector
			if (isVector) {
				return new $.matrix['V' + b.length](elements);
			} else {
				return new $.matrix['M' + rows + 'x' + rows](elements);
			}
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
	$.extend($.matrix.V3.prototype, Vector, {
		toV2: function() {
			return new $.matrix.V2(
				this.e(1) - this.e(3),
				this.e(2) - this.e(3)
			);
		}
		
	});
	$.extend($.matrix.V4.prototype, Vector, {
		toV3: function() {
			return new $.matrix.V3(
				this.e(1) / this.e(4),
				this.e(2) / this.e(4),
				this.e(3) / this.e(4)
			);
		}
	});
})(jQuery, this, this.document);