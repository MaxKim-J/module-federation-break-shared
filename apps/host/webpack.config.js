const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const path = require("path");

module.exports = {
  entry: "./src/index.tsx",
  mode: "development",
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"),
    },
    port: 3000,
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
      name: "host",
      remotes: {
        remote1: `remote1@http://localhost:3001/remoteEntry.js`,
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: "^18.0.2",
        },
        "react-dom": {
          singleton: true,
          requiredVersion: "^18.0.2",
        },
      },
    }),
    new HtmlWebpackPlugin({
      template: "./index.html",
    }),
  ],
};
