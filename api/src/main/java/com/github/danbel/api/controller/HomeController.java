package com.github.danbel.api.controller;

import com.github.danbel.api.dto.home.HomePageDataDto;
import com.github.danbel.api.dto.search.SearchKnowledgeResponseDto;
import com.github.danbel.api.service.HomeService;
import com.github.danbel.api.service.KnowledgeSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class HomeController {

    private final HomeService homeService;
    private final KnowledgeSearchService searchService;

    @GetMapping("/home")
    public HomePageDataDto getHomePageData() {
        return homeService.getHomePageData();
    }

    @GetMapping("/search")
    public SearchKnowledgeResponseDto searchKnowledge(@RequestParam String query) {
        return searchService.search(query);
    }
}
