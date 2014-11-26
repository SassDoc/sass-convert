# sass-convert
> Node.js bindings to [sass-convert].

sass-convert is a library that provides binding for Node.js to [sass-convert],
the converter that ship with Sass.


## Options

### from*
type: `String`
The format to convert from. Can be `css`, `scss`, `sass`.

### to*
type: `String`  
The format to convert to. Can be `scss` or `sass`.

### dasherize
type: `Boolean`  
Convert underscores to dashes.

### indent
type: `Number|String`  
How many spaces to use for each level of indentation. Defaults to 2.
`'t'`` means use hard tabs.

### old
type: `Boolean`  
Output the old-style `:prop val` property syntax.
Only meaningful when generating Sass.

### default-encoding
type: `String`  
Specify the default encoding for input files.

### unix-newlines
type: `Boolean`  
Use Unix-style newlines in written files.
Always true on Unix.


## Credits

* [Pascal Duez](https://twitter.com/pascalduez)
* [Valérian Galliat](https://twitter.com/valeriangalliat)
* [Fabrice Weinberg](https://twitter.com/fweinb)
* [Hugo Giraudel](http://twitter.com/HugoGiraudel)


## Licence

sass-convert is [unlicensed](http://unlicense.org/).


[sass-convert]: http://sass-lang.com/documentation/#executables
