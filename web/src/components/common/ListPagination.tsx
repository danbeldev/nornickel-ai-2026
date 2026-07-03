import { Pagination, Stack, Typography } from '@mui/material';

interface ListPaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onChange: (page: number) => void;
}

export const ListPagination = ({
  page,
  pageSize,
  totalItems,
  onChange,
}: ListPaginationProps) => {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  if (pageCount <= 1) return null;

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      justifyContent="space-between"
      gap={1}
      sx={{ px: 0.5, pt: 0.5 }}
    >
      <Typography variant="caption" color="text.secondary">
        {firstItem}–{lastItem} из {totalItems}
      </Typography>
      <Pagination
        page={page}
        count={pageCount}
        onChange={(_, value) => onChange(value)}
        size="small"
        color="primary"
        shape="rounded"
        siblingCount={1}
      />
    </Stack>
  );
};
