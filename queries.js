export const languageQuery = {
    operationName: 'languageList',
    query: `query languageList {
        languageList {
            id
            name
        }
    }`
}

export const problemQuery = (variables = {}) => ({
    operationName: 'problemsetQuestionList',
    variables: {
        ...{
            categorySlug: '',
            skip: 0,
            limit: 50,
            filters: {}
        },
        ...variables
    },
    query: `query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
        problemsetQuestionList: questionList(
            categorySlug: $categorySlug
            limit: $limit
            skip: $skip
            filters: $filters
        ) {
            total: totalNum
            questions: data {
                questionId
                title
                titleSlug
                difficulty
                topicTags {
                    name
                    id
                    slug
                }
                hints
                metaData
                testCases: exampleTestcaseList
                codeSnippets {
                    lang
                    langSlug
                    code
                }
                content,
                solution {
                    content
                }
            }
        }
    }`
});