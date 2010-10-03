
	
	$.extend($.matrix.M4x4.prototype, Matrix, {
		/**
		 * Multiply a 4x4 by a compatible matrix or a vector
		 * @param Matrix | Vector
		 * @return M4x4 | V4
		 */
		x: function(matrix) {
			// Ensure the right-sized matrix
			if (matrix.rows < 4) {
				matrix = matrix.toM4x4();
			}
			
			var a = this.elements,
				b = matrix.elements,
				isVector = typeof(matrix.rows) === 'undefined',
				rows =  !isVector ? matrix.rows : matrix.length, //b rows
				cols = this.cols;
			
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
			
			tmp[0][0] = (
				a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3],
				a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3],
				a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3],
				a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3],
				
				a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7],
				a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7],
				a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7],
				a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7],
				
				a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11],
				a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11],
				a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11],
				a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11],
				
				a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15],
				a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15],
				a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15],
				a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15]);
		}
	});
	//---------------------------------------------------
	function testOrig() {
		// capture the original element
		var $elem = $('#fake div'),
			height = $elem.outerHeight(),
			width = $elem.outerWidth();
		
		//console.log(height, width);
		
		// Create a matrix
		var	matrix = $.matrix.rotateX(20).x($.matrix.rotateY(20));
		
		// Calculate the corners
		var calc = new $.matrix.calc(matrix, height, width),
			size = calc.offset(),
			patch = (size.height / 9) * (size.width / 9), // divide it 8 times, for now
			frag = document.createDocumentFragment();
		
		// subdivide the object
		divideOrig($elem, calc, patch, frag);
		$elem.css({
			visibility: 'hidden',
			position: 'relative'
		}).append(frag.cloneNode(true));
		
	};
	
	/**
	 * @param Collection $elem
	 * @param Object sides
	 */
	function divideOrig($elem, calc, patch, frag) {
		var area = calc.area(),
			//r = calc.nonAffinity(), // likely isn't needed
			c = calc.corners();
			
	//	if ((area * 4) * (0.25 + r * 5) > patch) {
		if (area >= patch) {
			// create a new calc object for each new$patch
			var calc1 = new $.matrix.calc(calc.matrix, calc.outerHeight, calc.outerWidth),
				calc2 = new $.matrix.calc(calc.matrix, calc.outerHeight, calc.outerWidth),
				calc3 = new $.matrix.calc(calc.matrix, calc.outerHeight, calc.outerWidth),
				calc4 = new $.matrix.calc(calc.matrix, calc.outerHeight, calc.outerWidth);
			
			// calculate the mid coordinates
			var m = {
				tltr: {
					x: (c.tl.x + c.tr.x) / 2,
					y: (c.tl.y + c.tr.y) / 2,
					z: (c.tl.z + c.tr.z) / 2
				},
				trbr: {
					x: (c.tr.x + c.br.x) / 2,
					y: (c.tr.y + c.br.y) / 2,
					z: (c.tr.z + c.br.z) / 2
				},
				blbr: {
					x: (c.bl.x + c.br.x) / 2,
					y: (c.bl.y + c.br.y) / 2,
					z: (c.bl.z + c.br.z) / 2
				},
				tlbl: {
					x: (c.tl.x + c.bl.x) / 2,
					y: (c.tl.y + c.bl.y) / 2,
					z: (c.tl.z + c.bl.z) / 2
				},
				tlbr: {
					x: (c.tl.x + c.br.x) / 2,
					y: (c.tl.y + c.br.y) / 2,
					z: (c.tl.z + c.br.z) / 2
				}
			};
			
			// doctor the calcs
			calc1.c = {
				tl: c.tl,
				tr: m.tltr,
				br: m.tlbr,
				bl: m.tlbl 
			};
			calc2.c = {
				tl: m.tltr,
				tr: c.tr,
				br: m.trbr,
				bl: m.tlbr 
			};
			calc3.c = {
				tl: m.tlbr,
				tr: m.trbr,
				br: c.br,
				bl: m.blbr 
			};
			calc4.c = {
				tl: m.tlbl,
				tr: m.tlbr,
				br: m.blbr,
				bl: c.bl 
			};
			
			// subdivide
			divideOrig($elem, calc1, patch, frag);
			divideOrig($elem, calc2, patch, frag);
			divideOrig($elem, calc3, patch, frag);
			divideOrig($elem, calc4, patch, frag);
		} else {
			counter++;
			renderPatch($elem, calc, patch, frag);
		}
	}
	
	function renderPatch($elem, calc, patch, frag) {
		var $clone = $elem.clone(),
			c = calc.corners(), // transformed corners
			im = calc.matrix.inverse(), //inverted matrix
			corners =['tl', 'tr', 'br', 'bl'];
			
		var m = {}, // a matrix for each corner
			ic = {}, // the inverted corners (pre-transform)
			i, len = corners.length, // temp variable
			v, // temp vector
			corner, prev, next; // the corner we're dealing with
		
		
		var area = {},
			la, lan, lap,
			pa = 0; // temp previous area
			
		//Loop all 4 corners
		for (i = 0; i < len, corner = corners[i]; i++) {
			prev = i - 1 < 0 ? corners[len - 1]: corners[i - 1];
			next = i + 1 >= len ? corners[0]: corners[i + 1];
			
			// find the biggest corner (area of a triangle)
			area[corner] = Math.abs(
				(c[next].x * c[corner].y - c[corner].x * c[next].y) +
				(c[prev].x * c[next].y - c[next].x * c[prev].y) +
				(c[corner].x * c[prev].y - c[prev].x * c[corner].y)
			)/2;
			if (area[corner] > pa){
				la = corner;
				lap = prev;
				lan = next;
			}
			pa = area[corner];
			
			// Invert Each Matrix to find the original corners
			// TODO: Why not save it from before?
			v = im.x(new $.matrix.V3(c[corner].x, c[corner].y, c[corner].z));
			
			ic[corner] = {
				x: Math.ceil(v.e(1)),
				y: Math.ceil(v.e(2))
			}
		}
		
		// Solve the largest corner to find it's a, b, c, d and tx, ty
		var ab, cd, mt = {};
		if (ic[la].x == 0 && ic[lap].x !== 0) {
			m[la+'m'] = $M([
				[ic[lap].x, ic[lap].y, 0],
				[ic[la].x, ic[la].y, 0],
				[ic[lan].x, ic[lan].y, 0]
			]);			
			m[la+'x'] = $V([c[lap].x, c[la].x, c[lan].x]);
			m[la+'y'] = $V([c[lap].y, c[la].y, c[lan].y]);
		} else if (ic[la].x == 0 && ic[lan].x !== 0) {
			m[la+'m'] = $M([
				[ic[lan].x, ic[lan].y, 0],
				[ic[la].x, ic[la].y, 0],
				[ic[lap].x, ic[lap].y, 0]
			]);			
			m[la+'x'] = $V([c[lan].x, c[la].x, c[lap].x]);
			m[la+'y'] = $V([c[lan].y, c[la].y, c[lap].y]);
		} else {
			m[la+'m'] = $M([
				[ic[la].x, ic[la].y, 0],
				[ic[lap].x, ic[lap].y, 0],
				[ic[lan].x, ic[lan].y, 0]
			]);
			m[la+'x'] = $V([c[la].x, c[lap].x, c[lan].x]);
			m[la+'y'] = $V([c[la].y, c[lap].y, c[lan].y]);
		}
		
		// Find the solution using row echelon reduction
		ab = rowEchelon(m[la+'m'].augment(m[la+'x']));
		cd = rowEchelon(m[la+'m'].augment(m[la+'y']));
		mt[la] = {
			a:  parseFloat(parseFloat(ab.e(1, 4)).toFixed(8)),
			b:  parseFloat(parseFloat(ab.e(2, 4)).toFixed(8)),
			c:  parseFloat(parseFloat(cd.e(1, 4)).toFixed(8)),
			d:  parseFloat(parseFloat(cd.e(2, 4)).toFixed(8)),
			tx: parseFloat(parseFloat(ab.e(3, 4)).toFixed(8)),
			ty: parseFloat(parseFloat(cd.e(3, 4)).toFixed(8))
		}
		
		// transform the corner
		if (mt[la].a == 0) {
			console.log(counter, la, ic[la].x, ic[lan].x,ic[lap].x);
		}
		//console.log([mt[la].a, mt[la].c, mt[la].b, mt[la].d, mt[la].tx, mt[la].ty]);
		$clone.transform({matrix: [mt[la].a, mt[la].c, mt[la].b, mt[la].d, mt[la].tx, mt[la].ty]});
		$clone.css({
			position: 'absolute',
			top: 0,
			left: 0,
			overflow: 'hidden',
			height: $elem.height() + 'px',
			width: $elem.width() + 'px',
			visibility: 'visible',
			clip: 'rect(' + ic.tl.y*1.05 + 'px, ' + ic.br.x*1.05 + 'px, ' + ic.br.y*1.05 + 'px, ' + ic.tl.x*1.05 + 'px)'
		}).addClass('patch');
		frag.appendChild($clone[0]);
		
	}
	
	
	function rowEchelon(matrix) {	
		var temp = matrix.dup().elements,
			rows = matrix.elements.length,
			cols = matrix.elements[0].length;
	
		// Do Gauss-Jordan algorithm.
		for (var yp = 0; yp < rows; ++yp) {
			// Look up pivot value.
			var pivot = temp[yp][yp];
			while (pivot == 0) {
				// If pivot is zero, find non-zero pivot below.
				for (var ys = yp + 1; ys < rows; ++ys) {
					if (temp[ys][yp] != 0) {
						// Swap rows.
						var tmpRow = temp[ys];
						temp[ys] = temp[yp];
						temp[yp] = tmpRow;
						break;
					}
				}
				if (ys == rows) {
					// No suitable pivot found. Abort.
					return $M(temp); //new Matrix(cols, rows, temp);
				}
				else {
					pivot = temp[yp][yp];				
				}
			};
			
			// Normalize this row.
			var scale = 1 / pivot;
			for (var x = yp; x < cols; ++x) {
				temp[yp][x] *= scale;
			}
			
			// Subtract this row from all other rows (scaled).
			for (var y = 0; y < rows; ++y) {
				if (y == yp) continue;
				var factor = temp[y][yp];
				temp[y][yp] = 0;
				for (var x = yp + 1; x < cols; ++x) {
					temp[y][x] -= factor * temp[yp][x];
				}
			}
		}	
	
		return $M(temp); 
		//return new Matrix(cols, rows, temp);
	}


	//Left-over crud
	{
		var d12 = [c.tr.x - c.tl.x, c.tr.y - c.tl.y];
		var d24 = [c.br.x - c.tr.x, c.br.y - c.tr.y];
		var d43 = [c.bl.x - c.br.x, c.bl.y - c.br.y];
		var d31 = [c.tl.x - c.bl.x, c.tl.y - c.bl.y];
		
		//console.log(d12, d24, d43, d31);
		
		// Find the corner that encloses the most area
		var a1 = Math.abs(d12[0] * d31[1] - d12[1] * d31[0]);
		var a2 = Math.abs(d24[0] * d12[1] - d24[1] * d12[0]); 
		var a4 = Math.abs(d43[0] * d24[1] - d43[1] * d24[0]);
		var a3 = Math.abs(d31[0] * d43[1] - d31[1] * d43[0]);
		var amax = Math.max(a1, a2, a3, a4);
		
		//console.log(d12, d31);
			
		// Align the transform along this corner.
		switch (amax) {
			case a1:
				//console.log('a1:', [d12[0], d12[1], -d31[0], -d31[1], c.tl.x, c.tl.y]);
				//$clone.transform({matrix: [d12[0], d12[1], -d31[0], -d31[1], c.tl.x, c.tl.y]});
				break;
			case a2:
				//console.log('a2:', [d12[0], d12[1],	d24[0],	d24[1], c.tr.x, c.tr.y]);
				//$clone.transform({matrix: [d12[0], d12[1],	d24[0],	d24[1], c.tr.x, c.tr.y]});
				break;
			case a4:
			//	console.log('a4:', [-d43[0], -d43[1], d24[0], d24[1], c.br.x, c.br.y]);
				//$clone.transform({matrix: [-d43[0], -d43[1], d24[0], d24[1], c.br.x, c.br.y]});
				break;
			case a3:
			//	console.log('a3:', [-d43[0], -d43[1], -d31[0], -d31[1], c.bl.x, c.bl.y]);
				//$clone.transform({matrix: [-d43[0], -d43[1], -d31[0], -d31[1], c.bl.x, c.bl.y]});
				break;
		}
		
		var tl = im.x(new $.matrix.V3(c.tl.x, c.tl.y, c.tl.z));
		var tr = im.x(new $.matrix.V3(c.tr.x, c.tr.y, c.tr.z));
		var br = im.x(new $.matrix.V3(c.br.x, c.br.y, c.br.z));
		var bl = im.x(new $.matrix.V3(c.bl.x, c.bl.y, c.bl.z));
		
		console.log('tl:', parseFloat(parseFloat(tl.e(1)).toFixed(4)), c.tl.x, ' - ', parseFloat(parseFloat(tl.e(2)).toFixed(4)), c.tl.y);
		console.log('tr:', parseFloat(parseFloat(tr.e(1)).toFixed(4)), c.tr.x, ' - ', parseFloat(parseFloat(tr.e(2)).toFixed(4)), c.tr.y);
		console.log('br:', parseFloat(parseFloat(br.e(1)).toFixed(4)), c.br.x, ' - ', parseFloat(parseFloat(br.e(2)).toFixed(4)), c.br.y);
		console.log('bl:', parseFloat(parseFloat(bl.e(1)).toFixed(4)), c.bl.x, ' - ', parseFloat(parseFloat(bl.e(2)).toFixed(4)), c.bl.y);
		
		console.log((13-17/5/3)/(2-4/5/3));
		console.log(13/2 - (17/5/3/4/5/3));
		var A = (c.tr.x-c.tl.x/parseInt(tl.e(2))/parseInt(tr.e(2)))/(parseInt(tr.e(1))-parseInt(tl.e(1))/parseInt(tl.e(2))/parseInt(tr.e(2))),
			B = (c.tl.x - A * parseInt(tl.e(1)) / parseInt(tl.e(2))),
			C = (c.tr.x-c.tl.x/parseInt(tl.e(2))/parseInt(tr.e(2)))/(parseInt(tr.e(1))-parseInt(tl.e(1))/parseInt(tl.e(2))/parseInt(tr.e(2))),
			D = (c.tl.x - C * parseInt(tl.e(1)) / parseInt(tl.e(2)));
	
		console.log('A:', A);
		console.log('B:', B);
		console.log('C:', C);
		console.log('D:', D);
		
		if (A) {
			var M = new $.matrix.M2x2(A, B, C, D);
			console.log(M.x(new $.matrix.V2(tl.e(1), tl.e(2))).elements);
		}
		//console.log('C' + parseInt(tl.e(1)) + ' + D' + parseInt(tl.e(2)) + ' = ' + c.tl.y);
		//console.log('A' + parseInt(tr.e(1)) + ' + B' + parseInt(tr.e(2)) + ' = ' + c.tr.x);
		//console.log('C' + parseInt(tr.e(1)) + ' + D' + parseInt(tr.e(2)) + ' = ' + c.tr.y);
		//console.log('A' + parseInt(bl.e(1)) + ' + B' + parseInt(bl.e(2)) + ' = ' + c.bl.x);
		//console.log('C' + parseInt(bl.e(1)) + ' + D' + parseInt(bl.e(2)) + ' = ' + c.bl.y);
		
		console.log('-----------------------');
				
		$clone.css({
			position: 'absolute',
			top: 0,
			left: 0,
			overflow: 'hidden',
			height: $elem.height() + 'px',
			width: $elem.width() + 'px',
			visibility: 'visible',
			clip: 'rect(' + Math.floor(tl.e(2)) + 'px, ' + Math.ceil(br.e(1)) + 'px, ' + Math.ceil(br.e(2)) + 'px, ' + Math.floor(tl.e(1)) + 'px)'
		}).addClass('patch');
		frag.appendChild($clone[0]);
	}