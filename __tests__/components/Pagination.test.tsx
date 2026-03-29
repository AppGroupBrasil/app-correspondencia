import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Pagination from '@/components/Pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    totalItems: 50,
    pageSize: 10,
    startIndex: 0,
    endIndex: 10,
    hasNextPage: true,
    hasPreviousPage: false,
    pageSizeOptions: [5, 10, 20, 50],
    onPageChange: jest.fn(),
    onPageSizeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render pagination info correctly', () => {
    render(<Pagination {...defaultProps} />);

    expect(
      screen.getByText((_, element) =>
        element?.textContent?.replace(/\s+/g, ' ').trim() === 'Mostrando 1 a 10 de 50 registos'
      )
    ).toBeInTheDocument();
  });

  it('should call onPageChange when clicking next button', () => {
    render(<Pagination {...defaultProps} />);

    const nextButton = screen.getByTitle('Próxima página');
    fireEvent.click(nextButton);

    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it('should call onPageChange when clicking a page number', () => {
    render(<Pagination {...defaultProps} />);

    const page3Button = screen.getByRole('button', { name: '3' });
    fireEvent.click(page3Button);

    expect(defaultProps.onPageChange).toHaveBeenCalledWith(3);
  });

  it('should disable previous button on first page', () => {
    render(<Pagination {...defaultProps} />);

    const prevButton = screen.getByTitle('Página anterior');
    expect(prevButton).toBeDisabled();
  });

  it('should disable next button on last page', () => {
    render(
      <Pagination
        {...defaultProps}
        currentPage={5}
        hasNextPage={false}
        hasPreviousPage={true}
      />
    );

    const nextButton = screen.getByTitle('Próxima página');
    expect(nextButton).toBeDisabled();
  });

  it('should call onPageSizeChange when changing page size', () => {
    render(<Pagination {...defaultProps} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '20' } });

    expect(defaultProps.onPageSizeChange).toHaveBeenCalledWith(20);
  });

  it('should not render when totalItems is 0', () => {
    const { container } = render(
      <Pagination {...defaultProps} totalItems={0} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should highlight current page', () => {
    render(<Pagination {...defaultProps} currentPage={3} />);

    const currentPageButton = screen.getByRole('button', { name: '3' });
    expect(currentPageButton).toHaveClass('bg-[#057321]');
  });
});
