export class TableRowMapping {
    /**
     * @param $
     * @param columns
     * @returns {{courier: *, city: *, created_at: *, description: *}}
     */
    static mapProgress($, columns) {
        return {
            created_at: $(columns[0]).text().trim(),
            description: $(columns[1]).text().trim(),
            courier: $(columns[2]).text().trim(),
            city: $(columns[3]).text().trim(),
        }
    }

    /**
     * @param $
     * @param columns
     * @returns {{task: *, route: *, courier: *, created_at: *, description: *}}
     */
    static mapRoutes($, columns) {
        return {
            created_at: $(columns[4]).text().trim(),
            description: $(columns[2]).text().trim(),
            task: $(columns[1]).text().trim(),
            courier: $(columns[3]).text().trim(),
            route: $(columns[0]).text().trim(),
        }
    }

    /**
     * @param $
     * @param columns
     * @returns {*}
     */
    static mapItems($, columns) {
        return $(columns[0]).text().trim()
    }
}
