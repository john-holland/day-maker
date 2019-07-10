/*
 * Copyright 2018 Peter Magnusson <kmpm@birchroad.net>
 */

/**

MIT License

Copyright (c) 2018 Peter Magnusson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

export class MeterWidget {
  
  constructor(element, options = {}) {
    this._angle = 0;
    this._value = 0;
    
    this.element = element;
    this.options = options;
    this.arc = element.getElementById('arc');
    this.image = this.element.getElementById('image');
    this.goalValue = options.goalValue || 360;
    this.onChange = options.onChange;
    this._color = this.arc.style.fill;
  }
  
  setAngle(angle) {
    if (angle === this._angle) {
      return;
    }
    this._angle = angle;
    if (this._angle > 360) {
      this.setAngle(this._angle - 360);
    }
    this.arc.sweepAngle = this._angle;
    if (typeof this.onChange === 'function') {
      this.onChange(this, this._angle, this._value);
    }
  }
  
  show() {
    this.element.style.display = 'inline'
  }
  
  hide() {
    this.element.style.display = 'none'
  }

  getAngle() {
    return this._angle;
  }
  
  setValue(value, goalValue) {
    if (goalValue !== undefined) this.goalValue = goalValue
    this._value = value;
    let angle = Math.floor(360 * (value / this.goalValue));
    if (angle > 360) {
      angle = 360;
    }
    this.setAngle(angle);
  }
  
  setColor(color) {
    if (color === this._color) {
      return;
    }
    this._color = color;
    this.arc.style.fill = color;
    this.image.style.fill = color;
  }
}