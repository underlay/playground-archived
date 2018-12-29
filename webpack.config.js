const options = {
	presets: [
		"@babel/preset-env",
		"@babel/preset-react",
		"@babel/preset-typescript",
	],
	plugins: ["@babel/plugin-proposal-class-properties"],
}

const exclude = /(?:node_modules|\.min\.js$|dist\/)/

module.exports = {
	entry: ["@babel/polyfill", "./src/index.tsx"],
	output: {
		filename: "bundle.js",
		path: __dirname + "/dist",
	},

	resolve: {
		extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
	},

	module: {
		rules: [
			// {
			// 	test: /\.tsx?$/,
			// 	exclude: /node_modules/,
			// 	use: [{ loader: "babel-loader", options }, { loader: "ts-loader" }],
			// },
			{
				test: /\.[jt]sx?$/,
				exclude,
				use: [{ loader: "babel-loader", options }],
			},
		],
	},
}
