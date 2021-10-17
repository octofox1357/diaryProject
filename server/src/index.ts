import 'dotenv/config';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { UserResolver } from './UserResolver';
import cookieParser from 'cookie-parser';
import { verify } from 'jsonwebtoken';
import { User } from './entity/User';
import { createAccessToken, createRefreshToken } from './auth';
import { sendRefreshToken } from './sendRefreshToken';

(async () => {
	const app = express();

	app.post('/refresh_token', async (req, res) => {
		const token = req.cookies.jid;
		if (!token) {
			return res.send({ ok: false, accessToken: '' });
		}

		let payload: any = null;

		try {
			payload = verify(token, process.env.REFRESH_TOKEN_SECRET);
		} catch (error) {
			console.log(error);
			return res.send({ ok: false, accessToken: '' });
		}

		const user = await User.findOne({ id: payload.userId });
		if (!user) {
			return res.send({ ok: false, accessToken: '' });
		}

		if (user.tokenVersion !== payload.tokenVersion) {
			return res.send({ ok: false, accessToken: '' });
		}

		sendRefreshToken(res, createAccessToken(user));

		return res.send({ ok: true, accessToken: createAccessToken(user) });
	});

	await createConnection();

	const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [UserResolver],
		}),
		context: ({ req, res }) => ({ req, res }),
	});

	await apolloServer.start();
	apolloServer.applyMiddleware({ app });

	app.listen(process.env.PORT || 3000, () => {
		console.log('express sever started');
	});
})();
