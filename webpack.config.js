const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  context: __dirname,
  devtool: "source-map",
  entry: "./front/src/index.js",
  output: {
    path: __dirname + "/front/dist",
    filename: "bundle.js"
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        cache: true,
      }),
    ],
  },  
}
