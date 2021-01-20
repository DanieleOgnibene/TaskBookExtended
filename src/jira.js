const JiraClient = require("jira-connector");

function test() {
    const jira = new JiraClient({
        host: "onedaygroup.atlassian.net",
        basic_auth: {
            email: "daniele.ognibene@scuolazoo.it",
            api_token: "nqHc2zN9TZdsI2zFzOvyD2A7"
        }
    });

    jira.search.search(
        {
            jql: 'assignee=currentUser()'
        },
        function (error, issue) {
            issue.issues.map(i => {
                const id = i.id;
                const key = i.key;
                const link = 'https://onedaygroup.atlassian.net/browse/' + key;
                const title = i.fields.summary;
                const description = i.fields.description;
                const status = i.fields.status.name;
                console.log(i.fields.status.statusCategory)
                console.log(title + ' ' + description + ' [ ' + status + ' ] ');
            })
        }
    );
}

module.exports = test;
