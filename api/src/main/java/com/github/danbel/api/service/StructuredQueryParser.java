package com.github.danbel.api.service;

import com.github.danbel.api.dto.chat.ChatNumericFilterDto;
import com.github.danbel.api.dto.chat.ChatQueryFiltersDto;
import com.github.danbel.api.model.enums.MentionableEntityType;
import org.springframework.stereotype.Component;

import java.time.Year;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class StructuredQueryParser {

    private static final Pattern LAST_YEARS = Pattern.compile(
            "(?iu)(?:(?:за\\s+)?последн\\w*|last)\\s+(\\d{1,2})\\s+(?:лет|years?)"
    );
    private static final Pattern YEAR_RANGE = Pattern.compile(
            "(?iu)(?:с\\s+)?((?:19|20)\\d{2})\\s*(?:-|–|—|по|до)\\s*((?:19|20)\\d{2})"
    );
    private static final Pattern YEAR = Pattern.compile("\\b((?:19|20)\\d{2})\\b");
    private static final Pattern SYMBOLIC_NUMBER = Pattern.compile(
            "(?iu)([\\p{L}][\\p{L}\\s-]{0,45}?)\\s*(<=|>=|≤|≥|<|>|=)\\s*"
                    + "(-?\\d+(?:[.,]\\d+)?)\\s*([%°\\p{L}/³0-9]+)?"
    );
    private static final Pattern NATURAL_NUMBER = Pattern.compile(
            "(?iu)(температур\\w*|концентрац\\w*|содержан\\w*|скорост\\w*|"
                    + "давлен\\w*|производительност\\w*|стоимост\\w*|затрат\\w*|"
                    + "temperature|concentration|content|speed|velocity|pressure|capacity|cost)"
                    + "[^\\d]{0,24}?"
                    + "(не\\s+более|не\\s+выше|до|меньше|ниже|не\\s+менее|"
                    + "не\\s+ниже|от|больше|выше|less\\s+than|below|under|"
                    + "more\\s+than|above|over|at\\s+most|at\\s+least)\\s+"
                    + "(-?\\d+(?:[.,]\\d+)?)\\s*([%°\\p{L}/³0-9]+)?"
    );
    private static final Pattern RANGE_NUMBER = Pattern.compile(
            "(?iu)(температур\\w*|концентрац\\w*|содержан\\w*|скорост\\w*|"
                    + "давлен\\w*|производительност\\w*|стоимост\\w*|затрат\\w*|"
                    + "temperature|concentration|content|speed|velocity|pressure|capacity|cost)"
                    + "[^\\d]{0,24}?(?:от|between)\\s+"
                    + "(-?\\d+(?:[.,]\\d+)?)\\s*(?:до|и|and)\\s+"
                    + "(-?\\d+(?:[.,]\\d+)?)\\s*([%°\\p{L}/³0-9]+)?"
    );

    public ParsedQuery parse(String query) {
        String normalized = query.toLowerCase(Locale.ROOT);
        Set<MentionableEntityType> types = detectTypes(normalized);
        List<String> countries = detectCountries(normalized);
        String geographyScope = detectGeographyScope(normalized);
        if ("comparison".equals(geographyScope)
                && countries.size() == 1
                && "Россия".equals(countries.get(0))) {
            countries = List.of();
        }
        YearWindow years = detectYears(normalized);
        List<ChatNumericFilterDto> numericConditions = detectNumbers(query);
        ResearchResponseMode responseMode = detectResponseMode(normalized);
        return new ParsedQuery(
                new ChatQueryFiltersDto(
                        List.copyOf(types),
                        countries,
                        geographyScope,
                        years.from(),
                        years.to(),
                        numericConditions
                ),
                responseMode
        );
    }

    private Set<MentionableEntityType> detectTypes(String query) {
        Set<MentionableEntityType> result = new LinkedHashSet<>();
        addWhen(result, query, MentionableEntityType.MATERIAL, "материал", "веществ", "сплав", "руда");
        addWhen(result, query, MentionableEntityType.EXPERIMENT, "эксперимент", "опыт", "испытан");
        addWhen(result, query, MentionableEntityType.PUBLICATION, "публикац", "стать", "патент", "диссертац", "литератур");
        addWhen(result, query, MentionableEntityType.PROCESS, "процесс", "выщелачив", "электроэкстракц", "плавк");
        addWhen(result, query, MentionableEntityType.TECHNOLOGY, "технолог", "метод", "решени");
        addWhen(result, query, MentionableEntityType.EXPERT, "эксперт", "автор", "исследовател");
        addWhen(result, query, MentionableEntityType.EQUIPMENT, "оборудован", "установк", "печ", "ванн");
        addWhen(result, query, MentionableEntityType.MATERIAL, "material", "alloy", "ore");
        addWhen(result, query, MentionableEntityType.EXPERIMENT, "experiment", "trial", "test");
        addWhen(result, query, MentionableEntityType.PUBLICATION, "publication", "article", "patent", "paper");
        addWhen(result, query, MentionableEntityType.PROCESS, "process", "leaching", "smelting", "electrowinning");
        addWhen(result, query, MentionableEntityType.TECHNOLOGY, "technology", "method", "solution");
        addWhen(result, query, MentionableEntityType.EXPERT, "expert", "author", "researcher");
        return result;
    }

    private void addWhen(
            Set<MentionableEntityType> result,
            String query,
            MentionableEntityType type,
            String... markers
    ) {
        for (String marker : markers) {
            if (query.contains(marker)) {
                result.add(type);
                return;
            }
        }
    }

    private List<String> detectCountries(String query) {
        List<String> countries = new ArrayList<>();
        addCountry(countries, query, "Россия", "росси", "рф");
        addCountry(countries, query, "Китай", "китай");
        addCountry(countries, query, "Канада", "канад");
        addCountry(countries, query, "Финляндия", "финлянд");
        addCountry(countries, query, "Норвегия", "норвег");
        addCountry(countries, query, "Казахстан", "казахстан");
        addCountry(countries, query, "Австралия", "австрали");
        addCountry(countries, query, "Россия", "russia", "russian");
        addCountry(countries, query, "Китай", "china", "chinese");
        addCountry(countries, query, "Канада", "canada", "canadian");
        addCountry(countries, query, "Финляндия", "finland", "finnish");
        addCountry(countries, query, "Норвегия", "norway", "norwegian");
        addCountry(countries, query, "Казахстан", "kazakhstan");
        addCountry(countries, query, "Австралия", "australia", "australian");
        return countries;
    }

    private void addCountry(
            List<String> countries,
            String query,
            String country,
            String... markers
    ) {
        for (String marker : markers) {
            if (query.contains(marker)) {
                countries.add(country);
                return;
            }
        }
    }

    private String detectGeographyScope(String query) {
        boolean domestic = query.contains("отечествен") || query.contains("российск")
                || query.contains("domestic") || query.contains("russian practice");
        boolean foreign = query.contains("зарубеж") || query.contains("миров") || query.contains("иностран")
                || query.contains("foreign") || query.contains("worldwide") || query.contains("global practice");
        if (domestic && foreign) {
            return "comparison";
        }
        if (domestic) {
            return "domestic";
        }
        if (foreign) {
            return "foreign";
        }
        return null;
    }

    private YearWindow detectYears(String query) {
        int currentYear = Year.now().getValue();
        Matcher lastYears = LAST_YEARS.matcher(query);
        if (lastYears.find()) {
            int amount = Integer.parseInt(lastYears.group(1));
            return new YearWindow(currentYear - amount + 1, currentYear);
        }
        Matcher range = YEAR_RANGE.matcher(query);
        if (range.find()) {
            int first = Integer.parseInt(range.group(1));
            int second = Integer.parseInt(range.group(2));
            return new YearWindow(Math.min(first, second), Math.max(first, second));
        }
        Matcher single = YEAR.matcher(query);
        if (single.find()) {
            int year = Integer.parseInt(single.group(1));
            return new YearWindow(year, year);
        }
        return new YearWindow(null, null);
    }

    private List<ChatNumericFilterDto> detectNumbers(String query) {
        List<ChatNumericFilterDto> result = new ArrayList<>();
        collectRanges(result, RANGE_NUMBER.matcher(query));
        collectNumeric(result, SYMBOLIC_NUMBER.matcher(query), true);
        collectNumeric(result, NATURAL_NUMBER.matcher(query), false);
        return result.stream().distinct().toList();
    }

    private void collectRanges(
            List<ChatNumericFilterDto> target,
            Matcher matcher
    ) {
        while (matcher.find()) {
            double first = Double.parseDouble(matcher.group(2).replace(',', '.'));
            double second = Double.parseDouble(matcher.group(3).replace(',', '.'));
            String unit = matcher.group(4) == null ? null : matcher.group(4).strip();
            target.add(new ChatNumericFilterDto(
                    matcher.group(1).strip(),
                    "BETWEEN",
                    null,
                    Math.min(first, second),
                    Math.max(first, second),
                    unit
            ));
        }
    }

    private void collectNumeric(
            List<ChatNumericFilterDto> target,
            Matcher matcher,
            boolean symbolic
    ) {
        while (matcher.find()) {
            String parameter = matcher.group(1).strip();
            String rawOperator = matcher.group(2).strip().toLowerCase(Locale.ROOT);
            double value = Double.parseDouble(matcher.group(3).replace(',', '.'));
            String unit = matcher.group(4) == null ? null : matcher.group(4).strip();
            target.add(new ChatNumericFilterDto(
                    parameter,
                    symbolic ? normalizeSymbol(rawOperator) : normalizeNatural(rawOperator),
                    value,
                    null,
                    null,
                    unit
            ));
        }
    }

    private String normalizeSymbol(String operator) {
        return switch (operator) {
            case "≤" -> "<=";
            case "≥" -> ">=";
            default -> operator;
        };
    }

    private String normalizeNatural(String operator) {
        if (operator.contains("не более") || operator.contains("не выше") || operator.equals("до")) {
            return "<=";
        }
        if (operator.contains("at most")) return "<=";
        if (operator.contains("меньше") || operator.contains("ниже")) {
            return "<";
        }
        if (operator.contains("less") || operator.contains("below") || operator.contains("under")) {
            return "<";
        }
        if (operator.contains("не менее") || operator.contains("не ниже") || operator.equals("от")) {
            return ">=";
        }
        if (operator.contains("at least")) return ">=";
        return ">";
    }

    private ResearchResponseMode detectResponseMode(String query) {
        if (query.contains("литературн") || query.contains("обзор публикац")
                || query.contains("обзор литературы")
                || query.contains("literature review")
                || query.contains("review of publications")) {
            return ResearchResponseMode.LITERATURE_REVIEW;
        }
        if (query.contains("сравн") || query.contains("compare")
                || query.contains("comparison")
                || query.contains(" vs ") || query.contains(" против ")) {
            return ResearchResponseMode.COMPARISON;
        }
        return ResearchResponseMode.DEFAULT;
    }

    public record ParsedQuery(
            ChatQueryFiltersDto filters,
            ResearchResponseMode responseMode
    ) {
    }

    private record YearWindow(Integer from, Integer to) {
    }
}
