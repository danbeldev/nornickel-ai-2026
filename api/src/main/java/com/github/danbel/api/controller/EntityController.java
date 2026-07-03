package com.github.danbel.api.controller;

import com.github.danbel.api.dto.entity.MentionableEntityPageDto;
import com.github.danbel.api.service.EntitySearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/entities")
public class EntityController {

    private final EntitySearchService service;

    @GetMapping("/search")
    public MentionableEntityPageDto searchMentionableEntities(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "6") int size
    ) {
        return service.search(query, page, size);
    }
}
