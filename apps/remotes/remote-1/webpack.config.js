const { ModuleFederationPlugin } = require("webpack").container;
const path = require("path");

module.exports = {
  entry: "./src/index",
  mode: "development",
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"),
    },
    port: 3001,
  },
  output: {
    publicPath: "auto",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "swc-loader",
        exclude: /node_modules/,
        options: {
          jsc: {
            transform: {
              react: {
                runtime: "automatic",
              },
            },
            parser: {
              syntax: "typescript",
              tsx: true,
            },
          },
        },
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "remote1",
      filename: "remoteEntry.js",
      exposes: {
        "./Feature": "./src/Feature",
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: "18.0.2",
        },
        "react-dom": {
          singleton: true,
          requiredVersion: "18.0.2",
        },
      },
    }),
  ],
};
