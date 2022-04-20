const environment = {
    baseUrl: "localhost:3000"
};


if (process.env.REACT_APP_ENV === "staging") {
    environment.baseUrl = "https://dev.questionablyepic.com/live"
}
else if (process.env.REACT_APP_ENV === "production") {
    environment.baseUrl = "https://questionablyepic.com/live"
}

export default environment;