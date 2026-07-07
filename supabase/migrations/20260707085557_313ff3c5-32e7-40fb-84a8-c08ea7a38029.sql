insert into public.user_roles (user_id, role)
values ('f31c27c9-ec1c-490c-9791-5a25424a5e0b', 'admin')
on conflict (user_id, role) do nothing;