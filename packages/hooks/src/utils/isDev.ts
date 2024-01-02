// 在构建过程中，会将 process.env.NODE_ENV 这样的表达式替换为实际的值（如 'development' 或 'production'）。所以，虽然在浏览器环境中直接运行这段代码会出错，
// 但是在实际的项目中，由于构建工具的处理，这段代码是可以正常运行的。
// Webpack 可以通过 `DefinePlugin` 插件来替换 `process.env.NODE_ENV` 这样的表达式。`DefinePlugin` 允许在编译时创建配置的全局常量，这在需要区分开发模式和生产模式来做不同的事情时非常有用。

// 例如，你可以在 webpack 配置文件中这样使用 `DefinePlugin`：

// ```javascript
// const webpack = require('webpack');

// module.exports = {
//   // ...
//   plugins: [
//     new webpack.DefinePlugin({
//       'process.env.NODE_ENV': JSON.stringify('production'),
//     }),
//   ],
// };
// ```

// 这样，Webpack 在构建过程中会将所有出现 `process.env.NODE_ENV` 的地方替换为 `'production'`。注意，由于 `DefinePlugin` 插件直接进行文本替换，所以提供给插件的值必须包含实际的 JavaScript 代码。这就是为什么我们需要使用 `JSON.stringify('production')`，而不是直接写 `'production'`。

const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

export default isDev;
