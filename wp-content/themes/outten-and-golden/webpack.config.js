const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const WebpackAssetsManifest = require("webpack-assets-manifest");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const PATHS = {
	build: "/wp-content/themes/outten-and-golden/dist/",
	src: path.join(__dirname, "src"),
};

const webpackConfig = {
	context: PATHS.src,
	watch: true,
	entry: {
		app: ["regenerator-runtime/runtime.js", "./js/app.js"],
	},
	output: {
		publicPath: PATHS.build,
		filename: "[name].[fullhash].js",
		chunkFilename: "[name].[fullhash].js",
		assetModuleFilename: "fonts/[name][ext][query]",
		path: path.resolve(process.cwd(), "dist"),
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				styles: {
				name: "styles",
				test: /\.css$/,
				chunks: "all",
				enforce: true,
				},
			},
		},
		minimize: true,
		minimizer: [new TerserPlugin()],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src/js/"),
		},
	},
	module: {
		rules: [
		{
			test: /\.js$/i,
			include: path.resolve(__dirname, "src"),
			use: {
				loader: "babel-loader",
				options: {
					presets: ["@babel/preset-env"],
				},
			},
		},
		{
			test: /\.(s[ac]|c)ss$/i,
			include: path.resolve(__dirname, "src"),
			use: [
				MiniCssExtractPlugin.loader,
				"css-loader",
				{
					loader: "postcss-loader",
					options: {
						postcssOptions: {
							plugins: [
							"postcss-import",
							"tailwindcss",
							"autoprefixer",
							"postcss-preset-env",
							],
						},
					},
				},
				{
					loader: "sass-loader",
					options: {
						implementation: require("sass"),
					},
				},
			],
		},
		{
			test: /\.(woff|ttf|eot|svg)(\?v=[a-z0-9]\.[a-z0-9]\.[a-z0-9])?$/,
			use: [
			{
				loader: "url-loader",
				options: {
					limit: 1000,
					name: "[name].[ext]",
				},
			},
			],
		},
		],
	},
	plugins: [
		new CleanWebpackPlugin(),
		new WebpackAssetsManifest(),
		new MiniCssExtractPlugin({
			filename: "[name].[fullhash].css",
		}),
	],
};

module.exports = webpackConfig;