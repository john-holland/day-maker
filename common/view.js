//Fromm https://github.com/gaperton/ionic-views
/**
MIT License

Copyright (c) 2017 Vlad Balin

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

import document from "document";
import { display } from "display";

const querySplitter = /\.|#|\S+/g;

// Main DOM search method.
export function $( query, el ){
  const selectors = query.match( querySplitter );
  let root = el || document;
  
  for( let i = 0; root && i < selectors.length; i++ ){
    const s = selectors[ i ];
    root = s === '#' ? $id( selectors[ ++i ], root ) :
           s === '.' ? $classAndType( 'getElementsByClassName', selectors[ ++i ], root ) :
                       $classAndType( 'getElementsByTypeName', s, root );
  }

  return root;
}

// Search subtrees by id...
function $id( id, arr ){
  if( Array.isArray( arr ) ){
    const res = [];

    for( let el of arr ){
      const x = el.getElementById( id );
      if( x ) res.push( x );
    }
  
    return res;
  }

  return arr.getElementById( id );
}

// Search subtrees by class or type...
function $classAndType( method, arg, arr ){
  if( Array.isArray( arr ) ){
    const res = [];

    for( let el of arr ){
      for( let el2 of el[ method ]( arg ) ){
        res.push( el2 );
      }
    }
  
    return res;
  }

  return arr[ method ]( arg );
}

export function $wrap( element ){
  return selector => selector ? $( selector, element ) : element;
}

export function $at( selector ){
  return $wrap( $( selector ) );
}

export class View {
  // el = $( '#your-view-id' )
  _subviews = [];

  constructor( options = {} ){
    this.options = options;
  }
  
  mount(){
    const { el } = this;
    if( el ) el.style.display = 'inline';
    this.onMount( this.options );
    return this;
  }

  // Callback called when view is mounted.
  onMount(){}
  
  insert( subview ){
    this._subviews.push( subview );
    return subview.mount();
  }

  unmount(){
    for( let subview of this._subviews ){
      subview.unmount();
    }
    
    this._subviews = [];
    
    this.onUnmount();
    
    const { el } = this;
    if( el ) el.style.display = 'none';
  }    
  
  // Callback called before view will be removed.
  onUnmount(){}

  remove( subview ){
    const { _subviews } = this;
    _subviews.splice( _subviews.indexOf( subview ), 1 );
    subview.unmount();
  }

  render(){
    if( display.on ){
      for( let subview of this._subviews ){
        subview.render(...arguments);
      }

      this.onRender(...arguments);
    }
  }
  
  // Callback called on render
  onRender(){}
}

export class Application extends View {
  // Current application screen.
  set screen( view ){
    if( this._screen ) this.remove( this._screen );

    // Poke the display so it will be on after the screen switch...
    display.poke();
    if (view) view.application = this;

    this.insert( this._screen = view ).render();
  }
  
  get screen(){ return this._screen; }
  
  // Switch the screen
  static switchTo( screenName ){
    const { instance } = Application;
    instance.screen = instance[ screenName ];
  }

  // Application is the singleton. Here's the instance.
  static instance = null;

  static start(){
    // Instantiate and mount an application.
    const app = Application.instance = new this();
    app.mount();
    
    // Refresh UI when the screen in on.
    display.onchange = () => {
      app.render(...arguments);
    }
  }
}
