cd core \
&& npm test \
&& cd ../server \
&& npm test \
&& cd ../server-ws \
&& npm test \
&& cd ../client  \
&& npm test \
&& cd ../parser  \
&& npm test \
&& cd ../client-browser-http \
&& npm test \
&& cd ../client-browser-ws \
&& npm test \
&& cd ../redis-signaling \
&& npm test \
|| exit 1