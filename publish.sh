cd core \
&& npm publish \
&& cd ../server \
&& npm publish \
&& cd ../server-ws \
&& npm publish \
&& cd ../client \
&& npm publish \
&& cd ../parser \
&& npm publish \
&& cd ../client-browser-http \
&& npm publish \
&& cd ../client-browser-ws \
&& npm publish \
&& cd ../redis-signaling \
&& npm publish \
|| exit 1