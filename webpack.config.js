const babelOptions = {
	presets: ["es2015", "react", "stage-2"],
	plugins: [
		[
			"transform-runtime",
			{
				polyfill: false,
				regenerator: true,
			},
		],
	],
}

module.exports = {
	entry: "./src/index.tsx",
	output: {
		filename: "bundle.js",
		path: __dirname + "/dist",
	},

	devtool: "source-map",

	resolve: {
		extensions: [".ts", ".tsx", ".js", ".json"],
	},

	module: {
		rules: [
			{
				test: /\.tsx?$/,
				exclude: /(node_modules)|(js-ipfs)/,
				use: [
					{ loader: "babel-loader", options: babelOptions },
					{ loader: "ts-loader" },
				],
			},
			{
				test: /\.js$/,
				exclude: /(node_modules)|(js-ipfs)/,
				use: [{ loader: "babel-loader", options: babelOptions }],
			},
			{
				test: /\.js$/,
				enforce: "pre",
				exclude: /(node_modules)|(js-ipfs)/,
				loader: "source-map-loader",
			},
		],
	},
}
